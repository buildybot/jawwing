import {
  sqliteTable,
  text,
  integer,
  real,
  uniqueIndex,
  index,
} from "drizzle-orm/sqlite-core";

// ─── users ───────────────────────────────────────────────────────────────────

export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    phone_hash: text("phone_hash").unique().notNull(),
    display_name: text("display_name"),
    type: text("type", { enum: ["human", "agent"] }).notNull().default("human"),
    verified: integer("verified", { mode: "boolean" }).notNull().default(false),
    agent_territory_id: text("agent_territory_id"),
    created_at: integer("created_at").notNull(),
    banned_until: integer("banned_until"),
  },
  (t) => ({
    idxUsersCreatedAt: index("idx_users_created_at").on(t.created_at),
    idxUsersType: index("idx_users_type").on(t.type),
    idxUsersAgentTerritory: index("idx_users_agent_territory").on(
      t.agent_territory_id
    ),
  })
);

// ─── territories ─────────────────────────────────────────────────────────────

export const territories = sqliteTable(
  "territories",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    h3_indexes: text("h3_indexes", { mode: "json" })
      .$type<string[]>()
      .notNull()
      .default([]),
    assigned_agent_id: text("assigned_agent_id").references(() => users.id, {
      onDelete: "set null",
    }),
    created_at: integer("created_at").notNull(),
  },
  (t) => ({
    idxTerritoriesCreatedAt: index("idx_territories_created_at").on(
      t.created_at
    ),
    idxTerritoriesAgent: index("idx_territories_agent").on(t.assigned_agent_id),
  })
);

// ─── posts ────────────────────────────────────────────────────────────────────
// user_id is the anonymous session cookie ID (no FK — not a real user account)
// ip_hash is SHA-256 of the poster's IP (for rate limiting + bans)

export const posts = sqliteTable(
  "posts",
  {
    id: text("id").primaryKey(),
    // Anonymous session cookie value — NOT a reference to users table
    user_id: text("user_id"),
    ip_hash: text("ip_hash"),
    content: text("content").notNull(),
    lat: real("lat").notNull(),
    lng: real("lng").notNull(),
    h3_index: text("h3_index").notNull(),
    score: integer("score").notNull().default(0),
    reply_count: integer("reply_count").notNull().default(0),
    created_at: integer("created_at").notNull(),
    expires_at: integer("expires_at").notNull(),
    status: text("status", { enum: ["active", "moderated", "removed"] })
      .notNull()
      .default("active"),
    mod_action_id: text("mod_action_id"),
    image_url: text("image_url"),
    image_width: integer("image_width"),
    image_height: integer("image_height"),
  },
  (t) => ({
    idxPostsUserId: index("idx_posts_user_id").on(t.user_id),
    idxPostsH3Index: index("idx_posts_h3_index").on(t.h3_index),
    idxPostsCreatedAt: index("idx_posts_created_at").on(t.created_at),
    idxPostsStatus: index("idx_posts_status").on(t.status),
    idxPostsExpiresAt: index("idx_posts_expires_at").on(t.expires_at),
    idxPostsH3Status: index("idx_posts_h3_status").on(t.h3_index, t.status),
    idxPostsIpHash: index("idx_posts_ip_hash").on(t.ip_hash),
  })
);

// ─── votes ────────────────────────────────────────────────────────────────────
// voter_hash is SHA-256 of voter's IP (no FK — anonymous, no account required)

export const votes = sqliteTable(
  "votes",
  {
    id: text("id").primaryKey(),
    post_id: text("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    // IP hash of the voter — 1 vote per IP per post
    voter_hash: text("voter_hash").notNull(),
    ip_hash: text("ip_hash"),
    value: integer("value").notNull(), // +1 or -1
    created_at: integer("created_at").notNull(),
  },
  (t) => ({
    uniqVotePerUser: uniqueIndex("uniq_vote_post_voter").on(t.post_id, t.voter_hash),
    idxVotesPostId: index("idx_votes_post_id").on(t.post_id),
    idxVotesVoterHash: index("idx_votes_voter_hash").on(t.voter_hash),
    idxVotesCreatedAt: index("idx_votes_created_at").on(t.created_at),
  })
);

// ─── replies ──────────────────────────────────────────────────────────────────
// user_id is the anonymous session cookie ID (no FK)
// ip_hash is SHA-256 of the replier's IP

export const replies = sqliteTable(
  "replies",
  {
    id: text("id").primaryKey(),
    post_id: text("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    parent_reply_id: text("parent_reply_id"),
    // Anonymous session cookie value — NOT a reference to users table
    user_id: text("user_id"),
    ip_hash: text("ip_hash"),
    content: text("content").notNull(),
    created_at: integer("created_at").notNull(),
    status: text("status", { enum: ["active", "moderated", "removed"] })
      .notNull()
      .default("active"),
  },
  (t) => ({
    idxRepliesPostId: index("idx_replies_post_id").on(t.post_id),
    idxRepliesUserId: index("idx_replies_user_id").on(t.user_id),
    idxRepliesCreatedAt: index("idx_replies_created_at").on(t.created_at),
    idxRepliesStatus: index("idx_replies_status").on(t.status),
    idxRepliesParent: index("idx_replies_parent").on(t.parent_reply_id),
    idxRepliesIpHash: index("idx_replies_ip_hash").on(t.ip_hash),
  })
);

// ─── mod_actions ──────────────────────────────────────────────────────────────

export const mod_actions = sqliteTable(
  "mod_actions",
  {
    id: text("id").primaryKey(),
    post_id: text("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    agent_id: text("agent_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    action: text("action", {
      enum: ["flag", "remove", "warn", "approve"],
    }).notNull(),
    rule_cited: text("rule_cited"),
    reasoning: text("reasoning"),
    created_at: integer("created_at").notNull(),
    appealed: integer("appealed", { mode: "boolean" }).notNull().default(false),
    appeal_result: text("appeal_result"),
  },
  (t) => ({
    idxModActionsPostId: index("idx_mod_actions_post_id").on(t.post_id),
    idxModActionsAgentId: index("idx_mod_actions_agent_id").on(t.agent_id),
    idxModActionsCreatedAt: index("idx_mod_actions_created_at").on(t.created_at),
    idxModActionsAction: index("idx_mod_actions_action").on(t.action),
  })
);

// ─── api_keys ─────────────────────────────────────────────────────────────────

export const api_keys = sqliteTable(
  "api_keys",
  {
    id: text("id").primaryKey(),
    user_id: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    key_hash: text("key_hash").unique().notNull(),
    territory_id: text("territory_id").references(() => territories.id, {
      onDelete: "set null",
    }),
    rate_limit: integer("rate_limit").notNull().default(50),
    created_at: integer("created_at").notNull(),
    last_used_at: integer("last_used_at"),
    revoked: integer("revoked", { mode: "boolean" }).notNull().default(false),
  },
  (t) => ({
    idxApiKeysUserId: index("idx_api_keys_user_id").on(t.user_id),
    idxApiKeysCreatedAt: index("idx_api_keys_created_at").on(t.created_at),
    idxApiKeysRevoked: index("idx_api_keys_revoked").on(t.revoked),
  })
);

// ─── reports ──────────────────────────────────────────────────────────────────
// reporter_hash is SHA-256 of reporter's IP (no FK — anonymous)

export const reports = sqliteTable(
  "reports",
  {
    id: text("id").primaryKey(),
    post_id: text("post_id")
      .notNull()
      .references(() => posts.id, { onDelete: "cascade" }),
    // IP hash of the reporter — anonymous, no account needed
    reporter_hash: text("reporter_hash").notNull(),
    ip_hash: text("ip_hash"),
    reason: text("reason").notNull(),
    created_at: integer("created_at").notNull(),
    resolved: integer("resolved", { mode: "boolean" }).notNull().default(false),
    mod_action_id: text("mod_action_id").references(() => mod_actions.id, {
      onDelete: "set null",
    }),
  },
  (t) => ({
    idxReportsPostId: index("idx_reports_post_id").on(t.post_id),
    idxReportsReporterHash: index("idx_reports_reporter_hash").on(t.reporter_hash),
    idxReportsCreatedAt: index("idx_reports_created_at").on(t.created_at),
    idxReportsResolved: index("idx_reports_resolved").on(t.resolved),
  })
);

// ─── waitlist ─────────────────────────────────────────────────────────────────

export const waitlist = sqliteTable(
  "waitlist",
  {
    id: text("id").primaryKey(),
    email: text("email").unique().notNull(),
    created_at: integer("created_at").notNull(),
  },
  (t) => ({
    idxWaitlistEmail: uniqueIndex("idx_waitlist_email").on(t.email),
    idxWaitlistCreatedAt: index("idx_waitlist_created_at").on(t.created_at),
  })
);

// ─── constitution_versions ────────────────────────────────────────────────────

export const constitution_versions = sqliteTable(
  "constitution_versions",
  {
    id: text("id").primaryKey(),
    version: text("version").notNull(),
    content: text("content").notNull(),
    summary: text("summary").notNull(),
    created_at: integer("created_at").notNull(),
    created_by: text("created_by").notNull().default("system"),
    status: text("status", { enum: ["active", "archived", "proposed", "rejected"] })
      .notNull()
      .default("proposed"),
  },
  (t) => ({
    idxConstitutionVersionsStatus: index("idx_cv_status").on(t.status),
    idxConstitutionVersionsCreatedAt: index("idx_cv_created_at").on(t.created_at),
  })
);

// ─── constitution_amendments ──────────────────────────────────────────────────

export const constitution_amendments = sqliteTable(
  "constitution_amendments",
  {
    id: text("id").primaryKey(),
    proposer_id: text("proposer_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description").notNull(),
    section: text("section").notNull(),
    proposed_text: text("proposed_text").notNull(),
    status: text("status", {
      enum: ["pending_review", "under_vote", "accepted", "rejected"],
    })
      .notNull()
      .default("pending_review"),
    mod_review_id: text("mod_review_id"),
    mod_reasoning: text("mod_reasoning"),
    votes_for: integer("votes_for").notNull().default(0),
    votes_against: integer("votes_against").notNull().default(0),
    vote_deadline: integer("vote_deadline"),
    created_at: integer("created_at").notNull(),
    resolved_at: integer("resolved_at"),
  },
  (t) => ({
    idxAmendmentsProposer: index("idx_ca_proposer").on(t.proposer_id),
    idxAmendmentsStatus: index("idx_ca_status").on(t.status),
    idxAmendmentsCreatedAt: index("idx_ca_created_at").on(t.created_at),
  })
);

// ─── banned_ips ───────────────────────────────────────────────────────────────

export const banned_ips = sqliteTable(
  "banned_ips",
  {
    id: text("id").primaryKey(),
    ip_hash: text("ip_hash").unique().notNull(),
    reason: text("reason"),
    banned_at: integer("banned_at").notNull(),
    expires_at: integer("expires_at"), // null = permanent
  },
  (t) => ({
    idxBannedIpsIpHash: uniqueIndex("idx_banned_ips_ip_hash").on(t.ip_hash),
    idxBannedIpsBannedAt: index("idx_banned_ips_banned_at").on(t.banned_at),
    idxBannedIpsExpiresAt: index("idx_banned_ips_expires_at").on(t.expires_at),
  })
);

// ─── uploads ──────────────────────────────────────────────────────────────────

export const uploads = sqliteTable(
  "uploads",
  {
    id: text("id").primaryKey(),
    url: text("url").notNull(),
    content_type: text("content_type").notNull(),
    size: integer("size").notNull(),
    width: integer("width"),
    height: integer("height"),
    ip_hash: text("ip_hash").notNull(),
    created_at: integer("created_at").notNull(),
    moderation_status: text("moderation_status", {
      enum: ["pending", "approved", "rejected"],
    })
      .notNull()
      .default("pending"),
  },
  (t) => ({
    idxUploadsCreatedAt: index("idx_uploads_created_at").on(t.created_at),
    idxUploadsIpHash: index("idx_uploads_ip_hash").on(t.ip_hash),
    idxUploadsModerationStatus: index("idx_uploads_moderation_status").on(t.moderation_status),
  })
);

// ─── Type exports ─────────────────────────────────────────────────────────────

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Post = typeof posts.$inferSelect;
export type NewPost = typeof posts.$inferInsert;
export type Vote = typeof votes.$inferSelect;
export type NewVote = typeof votes.$inferInsert;
export type Reply = typeof replies.$inferSelect;
export type NewReply = typeof replies.$inferInsert;
export type ModAction = typeof mod_actions.$inferSelect;
export type NewModAction = typeof mod_actions.$inferInsert;
export type Territory = typeof territories.$inferSelect;
export type NewTerritory = typeof territories.$inferInsert;
export type ApiKey = typeof api_keys.$inferSelect;
export type NewApiKey = typeof api_keys.$inferInsert;
export type Report = typeof reports.$inferSelect;
export type NewReport = typeof reports.$inferInsert;
export type Waitlist = typeof waitlist.$inferSelect;
export type NewWaitlist = typeof waitlist.$inferInsert;
export type ConstitutionVersion = typeof constitution_versions.$inferSelect;
export type NewConstitutionVersion = typeof constitution_versions.$inferInsert;
export type ConstitutionAmendment = typeof constitution_amendments.$inferSelect;
export type NewConstitutionAmendment = typeof constitution_amendments.$inferInsert;
export type BannedIp = typeof banned_ips.$inferSelect;
export type NewBannedIp = typeof banned_ips.$inferInsert;
export type Upload = typeof uploads.$inferSelect;
export type NewUpload = typeof uploads.$inferInsert;
