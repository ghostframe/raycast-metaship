import axios from "axios";
import { parseContainerName, waitForUrlReady } from "./util";
import { open, showToast, Toast } from "@raycast/api";
import { exec } from "child_process";

const loginQuery =
  "query authLogin($provider: ID!, $configuration: ID, $credentials: Object, $linkUser: Boolean, $forceSessionsLogout: Boolean) {\n  authInfo: authLogin(\n    provider: $provider\n    configuration: $configuration\n    credentials: $credentials\n    linkUser: $linkUser\n    forceSessionsLogout: $forceSessionsLogout\n  ) {\n    redirectLink\n    authId\n    authStatus\n    userTokens {\n      ...AuthToken\n    }\n  }\n}\n    \n    fragment AuthToken on UserAuthToken {\n  authProvider\n  authConfiguration\n  loginTime\n  message\n  origin {\n    ...ObjectOriginInfo\n  }\n}\n    \n    fragment ObjectOriginInfo on ObjectOrigin {\n  type\n  subType\n  displayName\n  icon\n}\n    ";

const addDbQuery =
  "mutation createConnection($projectId: ID!, $config: ConnectionConfig!, $includeAuthProperties: Boolean!, $includeNetworkHandlersConfig: Boolean!, $includeCredentialsSaved: Boolean!, $includeAuthNeeded: Boolean!, $includeProperties: Boolean!, $includeProviderProperties: Boolean!, $customIncludeOptions: Boolean!) {\n    connection: createConnection(projectId: $projectId, config: $config) {\n      ...DatabaseConnection\n    }\n  }\n      \n      fragment DatabaseConnection on ConnectionInfo {\n    id\n    projectId\n    name\n    description\n    driverId\n    connected\n    readOnly\n    saveCredentials\n    credentialsSaved @include(if: $includeCredentialsSaved)\n    sharedCredentials\n    folder\n    nodePath\n    mainPropertyValues\n    configurationType @include(if: $customIncludeOptions)\n    useUrl @include(if: $customIncludeOptions)\n    host @include(if: $customIncludeOptions)\n    port @include(if: $customIncludeOptions)\n    serverName @include(if: $customIncludeOptions)\n    databaseName @include(if: $customIncludeOptions)\n    url @include(if: $customIncludeOptions)\n    properties @include(if: $includeProperties)\n    providerProperties @include(if: $includeProviderProperties)\n    requiredAuth\n    features\n    supportedDataFormats\n    authNeeded @include(if: $includeAuthNeeded)\n    authModel\n    authProperties @include(if: $includeAuthProperties) {\n      ...UserConnectionAuthProperties\n    }\n    networkHandlersConfig @skip(if: $includeNetworkHandlersConfig) {\n      ...NetworkHandlerBasics\n    }\n    networkHandlersConfig @include(if: $includeNetworkHandlersConfig) {\n      ...NetworkHandlerBasics\n      authType\n      userName\n      password\n      key\n      savePassword\n      properties\n      secureProperties\n    }\n    navigatorSettings {\n      ...AllNavigatorSettings\n    }\n    canViewSettings\n    canEdit\n    canDelete\n  }\n      \n      fragment UserConnectionAuthProperties on ObjectPropertyInfo {\n    id\n    displayName\n    description\n    category\n    dataType\n    value\n    validValues\n    defaultValue\n    length\n    features\n    required\n    order\n    conditions {\n      ...Condition\n    }\n  }\n      \n      fragment Condition on Condition {\n    expression\n    conditionType\n  }\n      \n  \n      fragment NetworkHandlerBasics on NetworkHandlerConfig {\n    id\n    enabled\n  }\n      \n  \n      fragment AllNavigatorSettings on NavigatorSettings {\n    showSystemObjects\n    showUtilityObjects\n    showOnlyEntities\n    mergeEntities\n    hideFolders\n    hideSchemas\n    hideVirtualModel\n  }";

const getDbsQuery =
  "query getUserConnections($projectId: ID, $connectionId: ID, $projectIds: [ID!], $includeAuthProperties: Boolean!, $includeNetworkHandlersConfig: Boolean!, $includeCredentialsSaved: Boolean!, $includeAuthNeeded: Boolean!, $includeProperties: Boolean!, $includeProviderProperties: Boolean!, $customIncludeOptions: Boolean!) {\n  connections: userConnections(\n    projectId: $projectId\n    id: $connectionId\n    projectIds: $projectIds\n  ) {\n    ...DatabaseConnection\n  }\n}\n    \n    fragment DatabaseConnection on ConnectionInfo {\n  id\n  projectId\n  name\n  description\n  driverId\n  connected\n  readOnly\n  saveCredentials\n  credentialsSaved @include(if: $includeCredentialsSaved)\n  sharedCredentials\n  folder\n  nodePath\n  mainPropertyValues\n  configurationType @include(if: $customIncludeOptions)\n  useUrl @include(if: $customIncludeOptions)\n  host @include(if: $customIncludeOptions)\n  port @include(if: $customIncludeOptions)\n  serverName @include(if: $customIncludeOptions)\n  databaseName @include(if: $customIncludeOptions)\n  url @include(if: $customIncludeOptions)\n  properties @include(if: $includeProperties)\n  providerProperties @include(if: $includeProviderProperties)\n  requiredAuth\n  features\n  supportedDataFormats\n  authNeeded @include(if: $includeAuthNeeded)\n  authModel\n  authProperties @include(if: $includeAuthProperties) {\n    ...UserConnectionAuthProperties\n  }\n  networkHandlersConfig @skip(if: $includeNetworkHandlersConfig) {\n    ...NetworkHandlerBasics\n  }\n  networkHandlersConfig @include(if: $includeNetworkHandlersConfig) {\n    ...NetworkHandlerBasics\n    authType\n    userName\n    password\n    key\n    savePassword\n    properties\n    secureProperties\n  }\n  navigatorSettings {\n    ...AllNavigatorSettings\n  }\n  canViewSettings\n  canEdit\n  canDelete\n}\n    \n    fragment UserConnectionAuthProperties on ObjectPropertyInfo {\n  id\n  displayName\n  description\n  category\n  dataType\n  value\n  validValues\n  defaultValue\n  length\n  features\n  required\n  order\n  conditions {\n    ...Condition\n  }\n}\n    \n    fragment Condition on Condition {\n  expression\n  conditionType\n}\n    \n\n    fragment NetworkHandlerBasics on NetworkHandlerConfig {\n  id\n  enabled\n}\n    \n\n    fragment AllNavigatorSettings on NavigatorSettings {\n  showSystemObjects\n  showUtilityObjects\n  showOnlyEntities\n  mergeEntities\n  hideFolders\n  hideSchemas\n  hideVirtualModel\n}\n    ";

const deleteDbQuery =
  "mutation deleteConnection($projectId: ID!, $connectionId: ID!) {\n  deleteConnection(projectId: $projectId, id: $connectionId)\n}\n    ";

const configureServerQuery =
  "query configureServer($configuration: ServerConfigInput!) {configureServer(configuration: $configuration)}";

export async function deleteDbByName(containerName: string) {
  const cookie = await loginAndGetCookie();
  const dbConnection = await getDbByName(cookie, containerName);
  if (!dbConnection) {
    console.log("Database not found in cloudbeaver", containerName);
    return;
  }
  console.log("Deleting database from cloudbeaver", containerName, dbConnection.id);
  await axios.post(
    "http://localhost:8978/api/gql",
    {
      query: deleteDbQuery,
      variables: {
        projectId: "g_GlobalConfiguration",
        connectionId: dbConnection.id,
      },
    },
    {
      headers: {
        Cookie: cookie,
      },
    },
  );
}

async function loginAndGetCookie() {
  const loginResponse = await axios.post("http://localhost:8978/api/gql", {
    query: loginQuery,
    variables: {
      provider: "local",
      credentials: { user: "cbadmin", password: "27470CEB955DF164B0878E3F09C58EFC" },
      linkUser: false,
      forceSessionsLogout: false,
    },
  });
  return loginResponse.headers["set-cookie"] as unknown as string;
}

async function getDbs(cookie: string) {
  const getDbsResponse = await axios.post(
    "http://localhost:8978/api/gql",
    {
      query: getDbsQuery,
      variables: {
        includeNetworkHandlersConfig: false,
        includeAuthProperties: false,
        includeAuthNeeded: false,
        includeCredentialsSaved: false,
        includeProperties: false,
        includeProviderProperties: false,
        customIncludeOptions: false,
        customIncludeBase: true,
      },
    },
    {
      headers: {
        Cookie: cookie,
      },
    },
  );
  return getDbsResponse.data.data.connections;
}

async function configureServer() {
  await axios.post("http://localhost:8978/api/gql", {
    query: configureServerQuery,
    variables: {
      configuration: {
        adminName: "cbadmin",
        adminPassword: "Cbadmin1",
        serverName: "CloudBeaver CE Server",
        serverURL: "http://localhost:8978",
        sessionExpireTime: 1200000000,
        adminCredentialsSaveEnabled: true,
        publicCredentialsSaveEnabled: true,
        customConnectionsEnabled: false,
        disabledDrivers: [],
        enabledAuthProviders: ["local"],
        anonymousAccessEnabled: true,
        enabledFeatures: [],
        resourceManagerEnabled: true,
        secretManagerEnabled: false,
      },
    },
  });
}

function getDriver(dbType: string) {
  if (dbType.includes("postgres")) {
    return "postgresql:postgres-jdbc";
  }
  if (dbType.includes("mysql")) {
    return "mysql:mariaDB";
  }
  if (dbType.includes("clickhouse")) {
    return "clickhouse:com_clickhouse";
  }
  throw new Error("Unknown database type: " + dbType);
}

async function addDb(cookie: string, containerName: string) {
  const { port, name } = parseContainerName(containerName);

  const driver = getDriver(name);
  try {
    const addDbResponse = await axios.post(
      "http://localhost:8978/api/gql",
      {
        query: addDbQuery,
        variables: {
          projectId: "g_GlobalConfiguration",
          config: {
            configurationType: "MANUAL",
            credentials: { userPassword: "db", userName: "db" },
            mainPropertyValues: { database: "", host: "host.docker.internal", port: port.toString() },
            networkHandlersConfig: [],
            properties: {},
            providerProperties: {},
            driverId: driver,
            name: containerName,
            host: "host.docker.internal",
            port: port.toString(),
            databaseName: "",
            authModelId: "native",
            saveCredentials: true,
          },
          includeNetworkHandlersConfig: false,
          includeAuthProperties: true,
          includeAuthNeeded: true,
          includeCredentialsSaved: true,
          includeProperties: true,
          includeProviderProperties: false,
          customIncludeOptions: false,
          customIncludeBase: true,
        },
      },
      {
        headers: {
          Cookie: cookie,
        },
      },
    );
    console.log("Added database", containerName, addDbResponse.data);
  } catch (e) {
    console.log("Error adding database", containerName, e);
  }
}

async function getDbByName(cookie: string, containerName: string) {
  const dbConnections = await getDbs(cookie);
  return dbConnections.find((db: { name: string }) => db.name === containerName);
}

export async function openDb(containerName: string) {
  await startCloudbeaverIfNotRunning();
  const cookie = await loginAndGetCookie();
  const dbConnection = await getDbByName(cookie, containerName);
  if (!dbConnection) {
    console.log("Adding database", containerName);
    await addDb(cookie, containerName);
  }
  open("http://localhost:8978");
}

export async function startCloudbeaverIfNotRunning() {
  try {
    await axios.get("http://localhost:8978");
  } catch {
    showToast({
      title: "Cloudbeaver not running, starting it",
      style: Toast.Style.Animated,
    });
    exec("docker run -d -p 8978:8978 --name metaship-cloudbeaver dbeaver/cloudbeaver:latest");

    showToast({
      title: "Waiting for cloudbeaver to be ready...",
      style: Toast.Style.Animated,
    });
    await waitForUrlReady("http://localhost:8978");
    await configureServer();

    showToast({
      title: "Cloudbeaver started, use cbadmin/Cbadmin1 to login",
      style: Toast.Style.Success,
    });
    console.log("Cloudbeaver started");
  }
}
