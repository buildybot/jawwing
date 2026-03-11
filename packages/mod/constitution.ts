export const CONSTITUTION_RULES = {
  prohibited: [
    {
      id: "P-1",
      name: "Hate Speech",
      description:
        "Content that dehumanizes people based on race, ethnicity, religion, gender, sexual orientation, disability, or national origin. Includes slurs used as attacks, calls for discrimination, and content portraying groups as subhuman.",
      clarification:
        "Discussing these topics critically, historically, or analytically is not hate speech.",
    },
    {
      id: "P-2",
      name: "Credible Threats",
      description:
        "Content threatening violence or serious harm to a specific person or group. Includes direct threats, conditional threats, and posts encouraging others to commit violence against identifiable targets.",
      clarification:
        '"I want to kill this exam" is not a threat. "I\'m going to find you and hurt you" is.',
    },
    {
      id: "P-3",
      name: "Doxxing",
      description:
        "Posting someone's private, personally identifying information without their consent. Includes real names tied to anonymous accounts, home addresses, phone numbers, workplace details, or combinations of information designed to identify or locate someone.",
      clarification: null,
    },
    {
      id: "P-4",
      name: "Child Sexual Abuse Material (CSAM)",
      description:
        "Any sexual content involving minors. Results in immediate permanent ban and reporting to authorities.",
      clarification: "Zero exceptions. Zero tolerance.",
    },
    {
      id: "P-5",
      name: "Illegal Activity Facilitation",
      description:
        "Content that directly facilitates illegal activity: soliciting or coordinating crimes, selling illegal goods/substances, sharing instructions for violence or weapon modification, or content that constitutes a crime (e.g., non-consensual intimate imagery).",
      clarification:
        "Discussing illegal topics (drug policy, crime news, legal gray areas) is different from actively facilitating illegal acts.",
    },
    {
      id: "II.6",
      name: "Sexually Explicit Content",
      description:
        "Nudity, pornography, sexual solicitation, and graphic sexual descriptions. This platform is not for adult content. Applies to both text and images.",
      clarification:
        "Educational discussions of sexuality, clinical language, and non-graphic references are permitted. Obvious NSFW content should be flagged with high confidence (>0.9). Borderline or ambiguous content may use lower confidence.",
    },
  ],
  restricted: [
    {
      id: "R-1",
      name: "NSFW Content",
      description:
        "Sexually explicit or graphic content may only be posted in communities with NSFW mode enabled. In general communities, such content will be removed.",
      clarification: null,
    },
    {
      id: "R-2",
      name: "Spam",
      description:
        "Repetitive posts, flooding a feed with near-identical content, or coordinated artificial amplification. A single post won't trigger this. A pattern will.",
      clarification: null,
    },
    {
      id: "R-3",
      name: "Commercial Content",
      description:
        "Unsolicited advertising, promotional posts, or affiliate links. Limited community announcements (local events, genuine recommendations) are fine.",
      clarification: null,
    },
    {
      id: "R-4",
      name: "Misleading Content",
      description:
        "Demonstrably false information designed to deceive, especially about local events, emergencies, or public safety. Satire and obvious jokes are not misleading. Content must be clearly false AND clearly intended to deceive.",
      clarification: null,
    },
    {
      id: "R-5",
      name: "Graphic Violence",
      description:
        "Gratuitous graphic violence (shock content posted for its own sake) is restricted in general communities. News, journalism, documentation of real events, and safety information may involve graphic elements and will be evaluated in context.",
      clarification: null,
    },
  ],
  principles: [
    "Free expression is the default. If a rule doesn't prohibit it, it's allowed.",
    "Context matters. Anonymous doesn't mean consequence-free, but don't assume the worst.",
    "Proportionality. Minor violations get minor responses.",
    "Consistency. Same content gets same treatment regardless of who posted it.",
    "Transparency. Every moderation action is logged with rule cited and reasoning.",
  ],
  allowedVideoSources: {
    id: "AV-1",
    name: "Allowed Video Links",
    description:
      "Video content may only be linked from platforms with established moderation policies. Users may share links to videos on these platforms. Native video upload is not supported.",
    allowedDomains: [
      { domain: "youtube.com", name: "YouTube", reason: "Google-moderated, community guidelines enforced" },
      { domain: "youtu.be", name: "YouTube (short)", reason: "Same as youtube.com" },
      { domain: "tiktok.com", name: "TikTok", reason: "ByteDance-moderated, community guidelines enforced" },
      { domain: "vimeo.com", name: "Vimeo", reason: "Staff-moderated, strict content policies" },
      { domain: "twitch.tv", name: "Twitch", reason: "Amazon-moderated, community guidelines enforced" },
      { domain: "instagram.com", name: "Instagram", reason: "Meta-moderated, community guidelines enforced" },
    ],
    policy:
      "Links to video hosting platforms not on this list will be flagged for review. This list can be amended through the standard amendment process.",
  },
  technology: {
    currentModel: "claude-haiku-4-5",
    modelProvider: "Google",
    rationale:
      "Fast inference (~200ms), cost-effective for high-volume content review, strong instruction following for rule-based decisions, sufficient capability for text content moderation.",
    selectionCriteria: [
      {
        id: "TC-1",
        label: "Speed",
        requirement: "Must process posts within 2 seconds of submission.",
      },
      {
        id: "TC-2",
        label: "Accuracy",
        requirement: "Must maintain >95% agreement with human reviewers on test set.",
      },
      {
        id: "TC-3",
        label: "Cost",
        requirement: "Must not exceed $0.001 per moderation decision at scale.",
      },
      {
        id: "TC-4",
        label: "Transparency",
        requirement: "Model provider must publish safety documentation.",
      },
      {
        id: "TC-5",
        label: "Independence",
        requirement:
          "No single provider lock-in. Model can be swapped with community notice.",
      },
    ],
    changePolicy:
      "Any model change requires 7-day public notice before deployment. The old and new model's test results must be published side-by-side prior to cutover.",
    auditCommitment:
      "Monthly publication of moderation accuracy statistics: false positive rate, false negative rate, and appeal overturn rate.",
  },
} as const;
