import { List, Icon, ActionPanel, Action, showToast, Toast } from "@raycast/api";
import { kill, runDb } from "./run";
import { getRunningMetashipDbs } from "./util";
import { deleteDbByName, openDb } from "./cloudbeaver";
import { useState } from "react";

export default function Command() {
  const [runningDbs, setRunningDbs] = useState<string[]>(getRunningMetashipDbs());

  async function createContainer(db: string) {
    const { dbName } = await runDb(db);
    showToast({
      title: "Created container",
      message: dbName,
      style: Toast.Style.Success,
    });
    setTimeout(() => {
      setRunningDbs(getRunningMetashipDbs());
    }, 1000);
  }

  async function killContainer(db: string) {
    try {
      showToast({
        title: "Killing container",
        message: db,
        style: Toast.Style.Animated,
      });
      kill(db);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setRunningDbs(getRunningMetashipDbs());
      showToast({
        title: "Deleted container",
        message: db,
        style: Toast.Style.Success,
      });
      await deleteDbByName(db);
    } catch (e) {
      console.error("Error killing container, skipping", e);
    }
    showToast({
      title: "Killed container",
      message: db,
      style: Toast.Style.Success,
    });
  }

  return (
    <List>
      <List.Section title="Running Databases">
        {runningDbs.map((db) => (
          <List.Item
            title={db}
            key={db}
            icon={Icon.Desktop}
            actions={
              <ActionPanel>
                <Action
                  title="Open"
                  onAction={() => {
                    openDb(db);
                  }}
                />
                <Action
                  title="Kill"
                  onAction={() => {
                    killContainer(db);
                  }}
                />
              </ActionPanel>
            }
          />
        ))}
      </List.Section>
      <List.Section title="Create Database">
        <List.Item
          title="PostgreSQL"
          icon={Icon.NewDocument}
          actions={
            <ActionPanel>
              <Action
                title="Create Container"
                onAction={() => {
                  createContainer("postgres");
                }}
              />
            </ActionPanel>
          }
        />

        <List.Item
          title="MariaDB"
          icon={Icon.NewDocument}
          actions={
            <ActionPanel>
              <Action
                title="Create Container"
                onAction={() => {
                  createContainer("mariadb");
                }}
              />
            </ActionPanel>
          }
        />
        <List.Item
          title="MySQL"
          icon={Icon.NewDocument}
          actions={
            <ActionPanel>
              <Action
                title="Create Container"
                onAction={() => {
                  createContainer("mysql");
                }}
              />
            </ActionPanel>
          }
        />

        <List.Item
          title="Clickhouse"
          icon={Icon.NewDocument}
          actions={
            <ActionPanel>
              <Action
                title="Create Container"
                onAction={() => {
                  createContainer("clickhouse");
                }}
              />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
