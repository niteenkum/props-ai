const fs = require('fs');
const path = require('path');

const imgUrl = "https://lh3.googleusercontent.com/aida/AP1WRLtr_XuxkOsveKE_9yjQAaqpLW1fH4IGVSL6-Vv1DakFhlgdjdT_Mx9AZMtkEGitDOCQ-iOpu22moG2EJeoYfl3OUg9Ij7JT44sLy5TDA9Jexm6rB8r3KJuxAntig9Ho4cUMFvDD2uwUqVNlStgFFt-6Pc54_mD0EuRgN3F50gE2SdbMeJD5Cm6JCQfPH08sxh8vDxZVLOX1X91X0iEBlkCwif4ZNCFGqSCOPg1A5wDoThzr4yeARV0c";
const htmlUrl = "https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ6Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpZCiVodG1sXzAwMDY1NGM2NmY0NzhjZmMwMWE2MGJkYTVjMzdkYzY5EgsSBxDc4u6D8AEYAZIBIgoKcHJvamVjdF9pZBIUQhI3NDMyNDkwNTc3NDEwMzA2NDk&filename=&opi=89354086";

async function downloadFile(url, destPath) {
  console.log(`Downloading from ${url} to ${destPath}...`);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.statusText}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(destPath, buffer);
  console.log(`Successfully saved to ${destPath}`);
}

async function run() {
  try {
    const publicDir = path.join(__dirname, "../public");
    const scratchDir = path.join(__dirname, "../scratch");

    if (!fs.existsSync(publicDir)) fs.mkdirSync(publicDir, { recursive: true });
    if (!fs.existsSync(scratchDir)) fs.mkdirSync(scratchDir, { recursive: true });

    await downloadFile(imgUrl, path.join(publicDir, "pitchly_landing.png"));
    await downloadFile(htmlUrl, path.join(scratchDir, "pitchly_landing.html"));
  } catch (err) {
    console.error("Error downloading files:", err);
  }
}

run();
