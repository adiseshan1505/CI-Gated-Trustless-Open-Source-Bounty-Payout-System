"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useAccount, useWriteContract } from "wagmi";
import {
  bountyEscrowAbi,
  ESCROW_ADDRESS,
  mockStore,
  publicClient,
  source,
  USE_MOCKS,
  type Address,
  type NewBountyInput,
  type NewSubmissionInput,
} from "@/lib/contracts";

const ZERO = "0x0000000000000000000000000000000000000000" as Address;

export const queryKeys = {
  bounties: ["bounties"] as const,
  bounty: (id: string) => ["bounty", id] as const,
  submissions: (bountyId: string) => ["submissions", bountyId] as const,
  submission: (id: string) => ["submission", id] as const,
  mySubmissions: (address?: string) => ["my-submissions", address] as const,
};

export function useBounties() {
  return useQuery({
    queryKey: queryKeys.bounties,
    queryFn: () => source.listBounties(),
  });
}

export function useBounty(id: bigint | undefined) {
  return useQuery({
    queryKey: queryKeys.bounty(id?.toString() ?? "none"),
    queryFn: () => source.getBounty(id!),
    enabled: id !== undefined,
  });
}

export function useBountySubmissions(bountyId: bigint | undefined) {
  return useQuery({
    queryKey: queryKeys.submissions(bountyId?.toString() ?? "none"),
    queryFn: () => source.listSubmissions(bountyId!),
    enabled: bountyId !== undefined,
  });
}

export function useSubmission(id: bigint | undefined) {
  return useQuery({
    queryKey: queryKeys.submission(id?.toString() ?? "none"),
    queryFn: () => source.getSubmission(id!),
    enabled: id !== undefined,
    refetchInterval: (query) =>
      query.state.data?.verified == null ? 5000 : false,
  });
}

export function useMySubmissions(address?: Address) {
  return useQuery({
    queryKey: queryKeys.mySubmissions(address),
    queryFn: () => source.listSubmissionsByDeveloper(address!),
    enabled: Boolean(address),
  });
}

export function useCreateBounty() {
  const qc = useQueryClient();
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();

  return useMutation({
    mutationFn: async (input: NewBountyInput) => {
      if (USE_MOCKS) {
        return mockStore.createBounty(input, address ?? ZERO);
      }
      const hash = await writeContractAsync({
        address: ESCROW_ADDRESS,
        abi: bountyEscrowAbi,
        functionName: "makeBounty",
        args: [input.repo, input.issueNumber],
        value: input.amountWei,
      });
      await publicClient.waitForTransactionReceipt({ hash });
      return { bountyId: 0n, hash };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.bounties });
    },
  });
}

export function useMakeSubmission() {
  const qc = useQueryClient();
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();

  return useMutation({
    mutationFn: async (input: NewSubmissionInput) => {
      if (USE_MOCKS) {
        return mockStore.createSubmission(input, address ?? ZERO);
      }
      const hash = await writeContractAsync({
        address: ESCROW_ADDRESS,
        abi: bountyEscrowAbi,
        functionName: "makeSubmission",
        args: [input.bountyId, input.prNumber],
      });
      await publicClient.waitForTransactionReceipt({ hash });
      return { submissionId: 0n, hash };
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: queryKeys.bounties });
      qc.invalidateQueries({
        queryKey: queryKeys.bounty(variables.bountyId.toString()),
      });
      qc.invalidateQueries({
        queryKey: queryKeys.submissions(variables.bountyId.toString()),
      });
      qc.invalidateQueries({ queryKey: queryKeys.mySubmissions(address) });
    },
  });
}

export function useResetMock() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => mockStore.reset(),
    onSuccess: () => qc.invalidateQueries(),
  });
}
