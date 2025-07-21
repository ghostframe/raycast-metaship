// List all issues for a given repo
import { Octokit } from "@octokit/rest";
const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});
export type Tag = {
  name: string;
  zipball_url: string;
  tarball_url: string;
  commit: {
    sha: string;
    url: string;
  };
  node_id: string;
};

export async function getTagList(githubToken: string) {
  let page = 1;
  const tags: Tag[] = [];
  while (true) {
    const response = await octokit.request("GET /repos/metabase/metabase/tags", {
      page,
      per_page: 100,
      headers: {
        "X-GitHub-Api-Version": "2022-11-28",
        Authorization: `Bearer ${githubToken}`,
      },
    });
    tags.push(...response.data);
    if (page === 10) {
      break;
    }
    page++;
  }
  return tags
    .filter(
      (t) =>
        !t.name.includes("beta") &&
        !t.name.includes("alpha") &&
        !t.name.includes("RC") &&
        !t.name.includes("rc") &&
        !t.name.startsWith("v1.") &&
        !t.name.endsWith(".x"),
    )
    .map((tag) => tag.name);
}
