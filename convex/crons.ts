import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "health-checks",
  { minutes: 5 },
  internal.actions.healthCheck.runHealthChecks
);

export default crons;
