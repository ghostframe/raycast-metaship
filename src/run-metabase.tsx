import { ActionPanel, Action, List, Icon, showToast, open, Toast, Clipboard } from "@raycast/api";
import { useEffect, useState } from "react";
import { getRunningMetashipDbs, getRunningMetashipMetabases, parseContainerName } from "./util";
import { kill, runMetabaseContainer } from "./run";
import { addDatabaseToMetabase, createApiKey, setupMetabase, waitForMetabaseReady } from "./mb";
import { getTagList } from "./tags";
import { Cache } from "@raycast/api";

const cache = new Cache();

async function getTags() {
  const cached = cache.get("tags");
  const lastUpdated = cache.get("tags-last-updated");
  let tags: string[] = [];
  if (cached && lastUpdated && new Date(lastUpdated).getTime() > Date.now() - 1000 * 60 * 60 * 24) {
    tags = JSON.parse(cached);
  } else {
    console.log("Fetching tags");
    showToast({
      title: "Fetching tags",
      message: "This may take a while",
      style: Toast.Style.Animated,
    });
    tags = await getTagList();
    showToast({
      title: "Tags fetched",
      message: "Tags fetched",
      style: Toast.Style.Success,
    });
    cache.set("tags", JSON.stringify(tags));
    cache.set("tags-last-updated", new Date().toISOString());
  }
  return tags;
}

export default function Command() {
  const [tags, setTags] = useState<string[]>([]);
  useEffect(() => {
    getTags().then((tags) => {
      setTags(tags);
    });
  }, []);

  const [selectedDb, setSelectedDb] = useState<string>("");
  const [metashipMetabases, setMetashipMetabases] = useState(
    getRunningMetashipMetabases().map((metabase) => parseContainerName(metabase)),
  );

  async function handleKill(containerName: string) {
    showToast({
      title: "Killing container",
      message: containerName,
      style: Toast.Style.Animated,
    });
    kill(containerName);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    showToast({
      title: "Container killed",
      message: containerName,
      style: Toast.Style.Success,
    });
    setMetashipMetabases(getRunningMetashipMetabases().map((metabase) => parseContainerName(metabase)));
  }

  async function createContainer(tag: string, db: string, enterprise = true) {
    const { containerName, port, process } = await runMetabaseContainer(tag, db, enterprise);
    process?.stdout?.on("data", (data) => {
      showToast({
        title: "Creating container",
        message: data.toString(),
        style: Toast.Style.Animated,
      });
    });
    process?.stderr?.on("data", (data) => {
      showToast({
        title: "Creating container",
        message: data.toString(),
        style: Toast.Style.Animated,
      });
    });

    await waitForMetabaseReady(port[0]);

    setupMetabase(port[0], containerName);
    showToast({
      title: "Container created",
      message: containerName,
      style: Toast.Style.Success,
    });
    setMetashipMetabases(getRunningMetashipMetabases().map((metabase) => parseContainerName(metabase)));

    open(`http://localhost:${port[0]}`);
  }

  async function handleAddDatabase(metabaseName: string, dbName: string) {
    try {
      await addDatabaseToMetabase(metabaseName, dbName);
      showToast({
        title: "Added database",
        message: dbName,
      });
    } catch (error: unknown) {
      showToast({
        title: "Error",
        message: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  const metashipDbsArray = getRunningMetashipDbs();

  return (
    <List
      searchBarAccessory={
        <List.Dropdown tooltip="Dropdown With Sections" onChange={(value) => setSelectedDb(value)}>
          <List.Dropdown.Item title="H2 Database" value="" />
          {metashipDbsArray.map((db) => (
            <List.Dropdown.Item title={db} value={db} key={db} />
          ))}
        </List.Dropdown>
      }
    >
      <List.Section title="Running">
        {metashipMetabases.map((metabase) => (
          <List.Item
            key={metabase.containerName}
            title={`Metabase ${metabase.name} ${metabase.containerName.includes("v0") ? "OSS" : ""} (${metabase.port})`}
            icon={Icon.AppWindow}
            actions={
              <ActionPanel>
                <Action title="Open" onAction={() => open(`http://localhost:${metabase.port}`)} />
                <Action title="Kill" onAction={() => handleKill(metabase.containerName)} />
                <Action
                  title="Create API Key"
                  onAction={async () => {
                    Clipboard.copy(await createApiKey(metabase.port));
                    showToast({
                      title: "API Key Copied",
                      message: "API Key Copied to Clipboard",
                      style: Toast.Style.Success,
                    });
                  }}
                ></Action>
                <Action
                  title="Copy Serialization Export Curl"
                  onAction={async () => {
                    const apiKey = await createApiKey(metabase.port);
                    Clipboard.copy(
                      `curl --location --request POST 'http://localhost:${metabase.port}/api/ee/serialization/export' --header 'X-API-KEY: ${apiKey}'`,
                    );
                    showToast({
                      title: "Serialization Export Curl Copied",
                      message: "Serialization Export Curl Copied to Clipboard",
                      style: Toast.Style.Success,
                    });
                  }}
                ></Action>
                {selectedDb && (
                  <Action
                    title="Add Selected DB"
                    onAction={() => handleAddDatabase(metabase.containerName, selectedDb)}
                  ></Action>
                )}
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      <List.Section title="Create">
        {tags.map((tag) => (
          <List.Item
            key={tag}
            title={tag.replace("v0.", "")}
            icon={Icon.Tag}
            keywords={[tag, tag.replace("v0.", "v1.")]}
            actions={
              <ActionPanel>
                <Action
                  title="Run Docker Container (Enterprise)"
                  onAction={() => {
                    createContainer(tag, selectedDb);
                  }}
                />
                <Action
                  title="Run Docker Container (OSS)"
                  onAction={() => {
                    createContainer(tag, selectedDb, false);
                  }}
                />
                <Action
                  title="Copy Docker Run"
                  onAction={async () => {
                    const { command } = await runMetabaseContainer(tag, selectedDb, false, true);
                    Clipboard.copy(command);
                    showToast({
                      title: "Docker Run Command Copied",
                      message: "Docker Run Command Copied to Clipboard",
                      style: Toast.Style.Success,
                    });
                  }}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
    </List>
  );
}
