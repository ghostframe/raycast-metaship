import axios from "axios";
import { parseContainerName, waitForUrlReady } from "./util";

export async function setupMetabase(port: number, containerName: string) {
  const container = parseContainerName(containerName);
  const token = (await axios.get(`http://localhost:${port}/api/session/properties`)).data["setup-token"];
  await axios.post(`http://localhost:${port}/api/setup`, {
    token,
    user: {
      first_name: "a",
      last_name: "b",
      email: "test@gmail.com",
      site_name: containerName,
      password: "123123123",
      password_confirm: "123123123",
    },
    prefs: {
      site_name: containerName,
      site_locale: "en",
    },
  });
  const session = await getSession(port);

  try {
    await axios.put(
      `http://localhost:${port}/api/setting/application-name`,
      {
        value: `metabase-${container.name}-${container.port}`,
      },
      {
        headers: {
          Cookie: `metabase.SESSION=${session}`,
        },
      },
    );
  } catch (e) {
    console.log("Error setting up metabase (probably was OSS)", e);
  }
}

export async function createApiKey(port: number) {
  const session = await getSession(port);
  const response = await axios.post(
    `http://localhost:${port}/api/api-key`,
    { name: `apikey-${new Date().toISOString()}`, group_id: 2 },
    {
      headers: {
        Cookie: `metabase.SESSION=${session}`,
      },
    },
  );
  return response.data.unmasked_key;
}

export async function waitForMetabaseReady(port: number) {
  await waitForUrlReady(`http://localhost:${port}/api/health`);
}

export async function getSession(port: number) {
  const response = await axios.post(`http://localhost:${port}/api/session`, {
    username: "test@gmail.com",
    password: "123123123",
    remember: true,
  });
  return response.data.id;
}

export function getDbPayload(databaseName: string, port: number) {
  const basePayload = {
    is_on_demand: false,
    is_full_sync: true,
    is_sample: false,
    cache_ttl: null,
    refingerprint: false,
    auto_run_queries: true,
    schedules: {},
    name: `${databaseName}-${port}`,
    details: {
      host: "host.docker.internal",
      port,
      dbname: "db",
      user: "db",
      password: "db",
      ssl: false,
      "tunnel-enabled": false,
      "advanced-options": false,
    },
  };

  if (databaseName.includes("postgres")) {
    return {
      ...basePayload,
      engine: "postgres",
      details: {
        ...basePayload.details,
        "schema-filters-type": "all",
      },
    };
  } else if (databaseName.includes("clickhouse")) {
    return {
      ...basePayload,
      engine: "clickhouse",
      details: {
        ...basePayload.details,
        "scan-all-databases": false,
        "destination-database": false,
      },
    };
  } else {
    return {
      ...basePayload,
      engine: "mysql",
      details: {
        ...basePayload.details,
        role: null,
        "destination-database": false,
        ...(databaseName.includes("mysql")
          ? {
              "additional-options": "trustServerCertificate=True",
            }
          : {}),
      },
    };
  }
}

export async function addDatabaseToMetabase(metabaseName: string, databaseName: string) {
  const metabase = parseContainerName(metabaseName);
  const database = parseContainerName(databaseName);
  const payload = getDbPayload(database.name, database.port);
  const session = await getSession(metabase.port);
  const databasesResponse = await axios.get(`http://localhost:${metabase.port}/api/database`, {
    headers: {
      Cookie: `metabase.SESSION=${session}`,
    },
  });
  const databases = databasesResponse.data.data;
  if (databases.find((db: { name: string }) => db.name === payload.name)) {
    throw new Error("Database already exists");
  }
  try {
    await axios.post(`http://localhost:${metabase.port}/api/database`, payload, {
      headers: {
        Cookie: `metabase.SESSION=${session}`,
      },
    });
  } catch (e) {
    console.log("Error adding database", databaseName, e["response"].data);
    throw e;
  }
}
