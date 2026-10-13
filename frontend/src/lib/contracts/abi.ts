/**
 * Placeholder ABI mirroring the proposed `IBountyEscrow` from the README.
 * Replace with the compiled artifact once the contract is implemented.
 */
export const bountyEscrowAbi = [
  {
    type: "function",
    name: "makeBounty",
    stateMutability: "payable",
    inputs: [
      { name: "repo", type: "string" },
      { name: "issueNumber", type: "uint256" },
    ],
    outputs: [{ name: "bountyId", type: "uint256" }],
  },
  {
    type: "function",
    name: "makeSubmission",
    stateMutability: "nonpayable",
    inputs: [
      { name: "bountyId", type: "uint256" },
      { name: "prNumber", type: "uint256" },
    ],
    outputs: [{ name: "submissionId", type: "uint256" }],
  },
  {
    type: "function",
    name: "verifySubmission",
    stateMutability: "nonpayable",
    inputs: [
      { name: "submissionId", type: "uint256" },
      { name: "success", type: "bool" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "getBounty",
    stateMutability: "view",
    inputs: [{ name: "bountyId", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "owner", type: "address" },
          { name: "repo", type: "string" },
          { name: "issueNumber", type: "uint256" },
          { name: "amount", type: "uint256" },
          { name: "status", type: "uint8" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "getSubmission",
    stateMutability: "view",
    inputs: [{ name: "submissionId", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "bountyId", type: "uint256" },
          { name: "developer", type: "address" },
          { name: "prNumber", type: "uint256" },
          { name: "submittedAt", type: "uint256" },
          { name: "verified", type: "bool" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "bountyCount",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "event",
    name: "BountyCreated",
    inputs: [
      { name: "bountyId", type: "uint256", indexed: true },
      { name: "owner", type: "address", indexed: true },
      { name: "repo", type: "string", indexed: false },
      { name: "issueNumber", type: "uint256", indexed: false },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "SubmissionCreated",
    inputs: [
      { name: "submissionId", type: "uint256", indexed: true },
      { name: "bountyId", type: "uint256", indexed: true },
      { name: "developer", type: "address", indexed: true },
      { name: "prNumber", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "SubmissionVerified",
    inputs: [
      { name: "submissionId", type: "uint256", indexed: true },
      { name: "success", type: "bool", indexed: false },
    ],
  },
  {
    type: "event",
    name: "BountyPaid",
    inputs: [
      { name: "bountyId", type: "uint256", indexed: true },
      { name: "developer", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
] as const;
