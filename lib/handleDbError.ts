interface DbErrorResult {
  response: Response;
}

/**
 * Centralized database error handler.
 * Logs the error and returns a formatted JSON response.
 */
export function handleDbError(
  context: string,
  error: unknown,
  isDev: boolean
): DbErrorResult {
  console.error(`[DB Error] ${context}:`, JSON.stringify(error, null, 2));
  
  return {
    response: Response.json(
      {
        error: `Database operation failed: ${context}`,
        detail: isDev ? error : undefined,
      },
      { status: 500 }
    ),
  };
}
