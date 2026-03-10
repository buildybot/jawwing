"use client";

import { useState } from "react";
import Header from "@/components/Header";
import FeedTabs, { SortTab } from "@/components/FeedTabs";
import PostCard, { Post } from "@/components/PostCard";
import CreatePostModal from "@/components/CreatePostModal";

const MOCK_POSTS: Post[] = [
  {
    id: "1",
    content:
      "The new coffee shop on Main St is actually incredible. Best espresso I've had in years. They open at 6:30am if anyone needs the early fix.",
    score: 142,
    replyCount: 23,
    timeAgo: "2h ago",
    distance: "0.3mi",
  },
  {
    id: "2",
    content:
      "Why is there always a cop parked in the bike lane outside the library? Cyclists have to swerve into traffic. Someone should report this.",
    score: 87,
    replyCount: 41,
    timeAgo: "4h ago",
    distance: "0.7mi",
  },
  {
    id: "3",
    content:
      "Lost a black lab mix near Riverside Park around noon. She's friendly, answers to Biscuit. Please DM if you see her.",
    score: 214,
    replyCount: 18,
    timeAgo: "6h ago",
    distance: "1.1mi",
  },
  {
    id: "4",
    content:
      "The city repaved Oak Ave and somehow made it worse. New potholes appeared within a week. $2M contract for this?",
    score: 56,
    replyCount: 67,
    timeAgo: "8h ago",
    distance: "1.4mi",
  },
  {
    id: "5",
    content:
      "Farmers market is back this Saturday, 8am–2pm at the usual spot. Vendor list looks stacked this week.",
    score: 193,
    replyCount: 12,
    timeAgo: "10h ago",
    distance: "0.5mi",
  },
  {
    id: "6",
    content:
      "Overheard at the gym: \"I just think people should be more accountable.\" Sir this is a Planet Fitness.",
    score: 512,
    replyCount: 88,
    timeAgo: "14h ago",
    distance: "0.2mi",
  },
];

export default function FeedPage() {
  const [activeTab, setActiveTab] = useState<SortTab>("hot");
  const [showModal, setShowModal] = useState(false);

  const sortedPosts = [...MOCK_POSTS].sort((a, b) => {
    if (activeTab === "hot") return b.score - a.score;
    if (activeTab === "top") return b.score + b.replyCount - (a.score + a.replyCount);
    return 0;
  });

  return (
    <div style={{ background: "#000000", minHeight: "100vh" }}>
      <Header location="Bethesda, MD" />

      <main style={{ maxWidth: "480px" }} className="mx-auto">
        {/* Tabs */}
        <FeedTabs active={activeTab} onChange={setActiveTab} />

        {/* Posts — tight stacking, 1px gap */}
        <div className="flex flex-col" style={{ gap: "2px", paddingTop: "2px" }}>
          {sortedPosts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>

        <p
          style={{
            fontFamily: "var(--font-mono), monospace",
            color: "#333333",
            fontSize: "0.6875rem",
            letterSpacing: "0.06em",
            textAlign: "center",
            padding: "40px 0 80px",
          }}
        >
          5 MILE RADIUS · ANONYMOUS
        </p>
      </main>

      {/* FAB */}
      <button
        onClick={() => setShowModal(true)}
        style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          width: "48px",
          height: "48px",
          background: "#FFFFFF",
          color: "#000000",
          border: "none",
          fontSize: "1.5rem",
          lineHeight: 1,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontWeight: 300,
          zIndex: 30,
          transition: "background 150ms, color 150ms",
        }}
        className="hover:bg-[#A0A0A0]"
        aria-label="Create post"
      >
        +
      </button>

      <CreatePostModal open={showModal} onClose={() => setShowModal(false)} />
    </div>
  );
}
