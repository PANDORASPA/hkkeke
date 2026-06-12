import { GET as runGet, POST as runPost } from "../cron/production/route";

export const runtime = "nodejs";
export const preferredRegion = "iad1";
export const maxDuration = 300;

export const GET = runGet;
export const POST = runPost;
