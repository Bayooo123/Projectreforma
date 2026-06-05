import { Prisma } from "@prisma/client";

/**
 * Returns a Prisma WHERE condition that matches briefs where the given user is attributed.
 * This includes:
 * 1. The lawyer who created the brief (lawyerId)
 * 2. The lawyer in charge (lawyerInChargeId)
 * 3. Any lawyer assigned via the many-to-many relationship (briefLawyers)
 * 4. Any lawyer assigned to the parent matter (matter.lawyers)
 */
export function getBriefAssignmentsFilter(userId: string): Prisma.BriefWhereInput {
  return {
    OR: [
      { lawyerId: userId },
      { lawyerInChargeId: userId },
      { briefLawyers: { some: { lawyerId: userId } } },
      { matter: { lawyers: { some: { lawyerId: userId } } } },
    ],
  };
}
