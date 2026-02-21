export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import {
    runAutomatedEvaluation,
} from "@/lib/ai/evaluation";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { EvaluateRequestSchema } from "@/lib/api/schemas";
import { internalErrorResponse, validationErrorResponse } from "@/lib/api/responses";

const supabase = createServiceRoleClient();

export async function POST(req: NextRequest) {
    try {
        const payload = await req.json();
        const parsed = EvaluateRequestSchema.safeParse(payload);
        if (!parsed.success) {
            return validationErrorResponse(parsed.error);
        }

        const { userId, cases } = parsed.data;
        const report = await runAutomatedEvaluation(supabase, userId, cases);
        return NextResponse.json(report);
    } catch (error) {
        console.error("Evaluation API error:", error);
        return internalErrorResponse("Evaluation failed", error);
    }
}
