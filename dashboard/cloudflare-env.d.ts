declare namespace Cloudflare {
  interface Env {
    FACEIT_API_KEY?: string;
    DB?: D1Database;
    BUCKET?: R2Bucket;
  }
}
