/** An error that is safe to show to the user, carrying the HTTP status to respond with. */
export class AppError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}
