import axios from "axios";
import { execSync } from "child_process";
import findFreePorts from "find-free-ports";

export async function getFreePort(startPort: number, endPort: number) {
  return await findFreePorts(1, { startPort, endPort });
}

export function getRunningMetashipContainers() {
  const metashipContainers = execSync("docker ps --format '{{.Names}}'").toString();
  const metashipContainersArray = metashipContainers.split("\n").filter((db) => db.includes("metaship-"));
  return metashipContainersArray;
}

export function getRunningMetashipMetabases() {
  return getRunningMetashipContainers().filter((db) => db.includes("metaship-metabase-"));
}

export function getRunningMetashipDbs() {
  return getRunningMetashipContainers().filter((db) => db.includes("metaship-db-"));
}

export function parseContainerName(containerName: string) {
  const [, type, name, port] = containerName.match(/metaship-(.*)-(.*)-(.*)/) ?? [];
  if (!type || !name || !port) {
    throw new Error(`Invalid container name: ${containerName}`);
  }
  return { type, name, port: parseInt(port), containerName };
}

export async function waitForUrlReady(url: string) {
  return new Promise((res) => {
    const interval = setInterval(async () => {
      try {
        const response = await axios.get(url);

        if (response.status === 200) {
          clearInterval(interval);
          res(true);
        }
      } catch { /* empty */ }
    }, 1000);
  });
}
