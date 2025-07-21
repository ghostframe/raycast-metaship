// List all issues for a given repo
import axios from "axios";

export type Tag = {
  creator: number;
  id: number;
  images: Array<{
    architecture: string;
    features: string;
    digest: string;
    os: string;
    os_features: string;
    size: number;
    status: string;
    last_pulled: string;
    last_pushed: string;
  }>;
  last_updated: string;
  last_updater: number;
  last_updater_username: string;
  name: string;
  repository: number;
  full_size: number;
  v2: boolean;
  tag_status: string;
  tag_last_pulled: string;
  tag_last_pushed: string;
  media_type: string;
  content_type: string;
  digest: string;
};

export async function getTagList() {
  console.log("Getting tag list from dockerhub");
  let page = 1;
  const tags: Tag[] = [];

  while (page < 10) {
    const response = await axios.get<{ results: Tag[] }>(
      `https://hub.docker.com/v2/repositories/metabase/metabase-enterprise/tags/?page_size=100&page=${page}`,
    );
    tags.push(...response.data.results);

    page++;
  }

  return tags
    .filter(
      (t) =>
        !t.name.includes("beta") &&
        !t.name.includes("alpha") &&
        !t.name.includes("RC") &&
        !t.name.includes("rc") &&
        !t.name.includes("nightly") &&
        !t.name.includes("latest") &&
        !t.name.includes("HEAD") &&
        !t.name.endsWith(".x") &&
        !t.name.startsWith("1.")
    )
    .map((tag) => tag.name.replace("v1", "v0"))
    .sort((a, b) => {
      const aVersion = a.replace("v0", "");
      const bVersion = b.replace("v0", "");
      return bVersion.localeCompare(aVersion);
    });
}
