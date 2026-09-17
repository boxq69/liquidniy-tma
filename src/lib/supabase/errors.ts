export function isMissingColumnError(error: {
  message?: string;
  code?: string;
} | null) {
  const message = error?.message ?? "";
  return (
    error?.code === "PGRST204" ||
    error?.code === "PGRST205" ||
    error?.code === "42P01" ||
    message.includes("schema cache") ||
    message.includes("does not exist")
  );
}
