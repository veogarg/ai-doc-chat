import { NextResponse } from "next/server";
import type { ZodError } from "zod";

export function validationErrorResponse(error: ZodError) {
    return NextResponse.json(
        {
            error: "Invalid request payload",
            issues: error.flatten(),
        },
        { status: 400 }
    );
}

export function internalErrorResponse(
    fallbackMessage: string,
    error: unknown,
    status = 500
) {
    return NextResponse.json(
        {
            error: fallbackMessage,
            details: error instanceof Error ? error.message : String(error),
        },
        { status }
    );
}
