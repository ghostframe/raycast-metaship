import { exec } from "child_process";
import { getFreePort, parseContainerName } from "./util";
import findFreePorts from "find-free-ports";
import { getPreferenceValues } from "@raycast/api";

export function getConnectionString(db: string) {
  if (db === "") {
    return null;
  }
  const dbInformation = parseContainerName(db);
  return `postgres://db:db@host.docker.internal:${dbInformation.port}/db`;
}

export function getAppDbType(db: string) {
  if (db === "") {
    return null;
  }
  return "postgres";
}

export function formatEnvDockerArguments(env: Record<string, string | null>) {
  const envParams = Object.entries(env).filter(([, value]) => value !== null);
  return envParams.map(([key, value]) => `-e ${key}=${value}`).join(" ");
}

export function formatEnvShellScript(env: Record<string, string | null>) {
  const envParams = Object.entries(env).filter(([, value]) => value !== null);
  return envParams.map(([key, value]) => `export ${key}=${value}`).join("\n");
}

// Tag looks like "v1.54.1"
export async function runMetabaseContainer(tag: string, db: string, enterprise = true, dryRun = false) {
  const port = await getFreePort(3001, 3999);
  const tagName = enterprise ? tag.replace("v0.", "v1.") : tag;
  const containerName = `metaship-metabase-${tagName}-${port[0]}`;
  const envParamsObject: Record<string, string | null> = {
    MB_DB_TYPE: getAppDbType(db),
    MB_DB_CONNECTION_URI: getConnectionString(db),
    ...(enterprise
      ? {
          MB_PREMIUM_EMBEDDING_TOKEN: getPreferenceValues().metabaseToken,
        }
      : {}),
  };

  const envParams = formatEnvDockerArguments(envParamsObject);
  const image = enterprise ? `metabase/metabase-enterprise:${tagName}` : `metabase/metabase:${tagName}`;

  const command = `docker run -d -p ${port[0]}:3000 --name ${containerName} ${envParams} ${image}`;
  if (!dryRun) {
    const process = exec(command);
    return { containerName, tagName, port, process, command };
  }

  return { containerName, tagName, port, command };
}

export async function runDb(db: string) {
  const port = await findFreePorts(1, { startPort: 5432 });
  const containerName = `metaship-db-${db}-${port[0]}`;
  switch (db) {
    case "postgres":
      exec(
        `docker run -d -e POSTGRES_USER=db -e POSTGRES_PASSWORD=db -p ${port[0]}:5432 --name ${containerName} postgres:16 -c log_statement=all -c max_locks_per_transaction=1000`,
      );
      break;
    case "mariadb":
      exec(
        `docker run -d --env MARIADB_USER=db --env MARIADB_PASSWORD=db --env MARIADB_DATABASE=db --env MARIADB_ROOT_PASSWORD=db -p ${port[0]}:3306 --name ${containerName} mariadb:10.11`,
      );
      break;
    case "mysql":
      exec(
        `docker run -d --env MYSQL_ROOT_PASSWORD=db --env MYSQL_DATABASE=db --env MYSQL_USER=db --env MYSQL_PASSWORD=db -p ${port[0]}:3306 --name ${containerName} mysql:8.0`,
      );
      break;
    case "clickhouse":
      exec(
        `docker run -d --env CLICKHOUSE_USER=db --env CLICKHOUSE_PASSWORD=db --env CLICKHOUSE_DB=db -p ${port[0]}:8123 --name ${containerName} clickhouse/clickhouse-server:latest`,
      );
      break;
  }
  return { dbName: containerName, port };
}

export function kill(containerName: string) {
  exec(`docker rm -f ${containerName}`);
}
