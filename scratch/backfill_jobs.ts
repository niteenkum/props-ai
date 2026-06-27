import { prisma } from "../app/utils/prisma";

async function main() {
  const email = "niteen@niteen.dev";
  
  // Count how many jobs have null userEmail
  const nullJobsCount = await prisma.jobPost.count({
    where: { userEmail: null }
  });
  console.log(`Found ${nullJobsCount} job posts with null userEmail.`);

  if (nullJobsCount > 0) {
    const updateResult = await prisma.jobPost.updateMany({
      where: { userEmail: null },
      data: { userEmail: email }
    });
    console.log(`Successfully backfilled ${updateResult.count} job posts to ${email}.`);
  }

  // Also verify total jobs for the user
  const totalUserJobs = await prisma.jobPost.count({
    where: { userEmail: email }
  });
  console.log(`Total job posts for ${email}: ${totalUserJobs}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
