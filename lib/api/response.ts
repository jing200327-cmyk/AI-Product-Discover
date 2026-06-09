import { NextResponse } from "next/server";
import { ZodError } from "zod";

type ApiError = {
  code: string;
  message: string;
};

export function successResponse<TData>(data: TData, init?: ResponseInit) {
  return NextResponse.json(
    {
      success: true,
      data
    },
    init
  );
}

export function errorResponse(error: ApiError, init?: ResponseInit) {
  return NextResponse.json(
    {
      success: false,
      error
    },
    init
  );
}

export function handleApiError(error: unknown) {
  if (error instanceof ZodError) {
    return errorResponse(
      {
        code: "VALIDATION_ERROR",
        message: error.issues.map((issue) => issue.message).join("; ")
      },
      {
        status: 400
      }
    );
  }

  const message =
    error instanceof Error ? error.message : "Unexpected API error";

  return errorResponse(
    {
      code: "INTERNAL_ERROR",
      message
    },
    {
      status: 500
    }
  );
}
