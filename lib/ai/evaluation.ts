import type { SupabaseClient } from "@supabase/supabase-js";
import { prepareRAG, generateFromPrompt, type ChatLikeMessage } from "@/lib/ai/rag";
import {
    createMetricsContext,
    logAndPersistMetrics,
    type MetricsContext,
} from "@/lib/ai/monitoring";

export interface EvaluationCase {
    question: string;
    expectedKeywords: string[];
}

export interface EvaluationCaseResult {
    question: string;
    expectedKeywords: string[];
    answer: string;
    sources: string[];
    retrievalCoverage: number;
    answerCoverage: number;
    groundedness: number;
    overallScore: number;
}

function keywordCoverage(text: string, keywords: string[]): number {
    if (!keywords.length) {
        return 1;
    }

    const normalized = text.toLowerCase();
    const hits = keywords.filter((keyword) =>
        normalized.includes(keyword.toLowerCase().trim())
    ).length;

    return hits / keywords.length;
}

function answerGroundedness(answer: string, evidence: string): number {
    const answerTokens = answer
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((token) => token.length >= 4);

    if (!answerTokens.length) {
        return 0;
    }

    const evidenceSet = new Set(
        evidence
            .toLowerCase()
            .split(/[^a-z0-9]+/)
            .filter((token) => token.length >= 4)
    );

    let overlap = 0;
    for (const token of answerTokens) {
        if (evidenceSet.has(token)) {
            overlap += 1;
        }
    }

    return overlap / answerTokens.length;
}

async function evaluateCase(
    supabase: SupabaseClient,
    userId: string,
    testCase: EvaluationCase
): Promise<EvaluationCaseResult> {
    const metrics: MetricsContext = createMetricsContext("/api/evaluate/case", userId);

    const messages: ChatLikeMessage[] = [
        { role: "user", content: testCase.question },
    ];

    const prepared = await prepareRAG(supabase, messages, userId, metrics);
    const answer = await generateFromPrompt(prepared.prompt, metrics);

    const evidenceText = prepared.rankedChunks.map((chunk) => chunk.content).join("\n\n");

    const retrievalCoverage = keywordCoverage(evidenceText, testCase.expectedKeywords);
    const answerCoverage = keywordCoverage(answer, testCase.expectedKeywords);
    const groundedness = answerGroundedness(answer, evidenceText);

    const overallScore =
        retrievalCoverage * 0.35 +
        answerCoverage * 0.4 +
        groundedness * 0.25;

    await logAndPersistMetrics(supabase, metrics, "evaluation_case_complete", {
        question: testCase.question,
        retrievalCoverage: Number(retrievalCoverage.toFixed(4)),
        answerCoverage: Number(answerCoverage.toFixed(4)),
        groundedness: Number(groundedness.toFixed(4)),
        score: Number(overallScore.toFixed(4)),
        sources: prepared.sources,
    });

    return {
        question: testCase.question,
        expectedKeywords: testCase.expectedKeywords,
        answer,
        sources: prepared.sources,
        retrievalCoverage: Number(retrievalCoverage.toFixed(4)),
        answerCoverage: Number(answerCoverage.toFixed(4)),
        groundedness: Number(groundedness.toFixed(4)),
        overallScore: Number(overallScore.toFixed(4)),
    };
}

export async function runAutomatedEvaluation(
    supabase: SupabaseClient,
    userId: string,
    cases: EvaluationCase[]
) {
    const results: EvaluationCaseResult[] = [];

    for (const testCase of cases) {
        results.push(await evaluateCase(supabase, userId, testCase));
    }

    const average = (values: number[]): number => {
        if (!values.length) {
            return 0;
        }

        return Number(
            (values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(4)
        );
    };

    const summary = {
        caseCount: results.length,
        averageRetrievalCoverage: average(results.map((result) => result.retrievalCoverage)),
        averageAnswerCoverage: average(results.map((result) => result.answerCoverage)),
        averageGroundedness: average(results.map((result) => result.groundedness)),
        averageOverallScore: average(results.map((result) => result.overallScore)),
    };

    const { error } = await supabase.from("rag_evaluations").insert({
        user_id: userId,
        summary,
        case_results: results,
    });

    if (error) {
        console.warn(
            "Evaluation persistence unavailable. Run Supabase migration for rag_evaluations.",
            error.message
        );
    }

    return {
        summary,
        results,
    };
}
