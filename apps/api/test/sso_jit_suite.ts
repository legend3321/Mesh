import { prisma } from "../db";
import { mapEnterpriseGroupsToRole } from "../controllers/Auth.controller";
import { mapEnterpriseGroupsToRole as webMapRole, extractDomainFromEmail } from "../../web/lib/sso";
import * as jwt from "jsonwebtoken";
import { getJwtSecret } from "../config/jwt";

const API_BASE_URL = process.env.API_BASE_URL || "http://127.0.0.1:3001";
const API_BASE_URL_V6 = "http://[::1]:3001";

interface TestReportItem {
  id: string;
  name: string;
  expected: any;
  actual: any;
  passed: boolean;
}

const testResults: TestReportItem[] = [];

function assert(id: string, name: string, condition: boolean, expected: any, actual: any) {
  testResults.push({ id, name, expected, actual, passed: condition });
  const statusStr = condition ? "\x1b[32m[PASS]\x1b[0m" : "\x1b[31m[FAIL]\x1b[0m";
  console.log(`  ${statusStr} ${id.padEnd(14)} | ${name}`);
  if (!condition) {
    console.error(`         Expected:`, expected);
    console.error(`         Actual:  `, actual);
  }
}

async function fetchApi(path: string, options: RequestInit) {
  try {
    return await fetch(`${API_BASE_URL}${path}`, options);
  } catch {
    return await fetch(`${API_BASE_URL_V6}${path}`, options);
  }
}

async function runSsoJitSuite() {
  console.log("\n================================================================================");
  console.log(" MESH ENTERPRISE SSO & JIT USER PROVISIONING TEST SUITE");
  console.log(" Timestamp:", new Date().toISOString());
  console.log("================================================================================\n");

  const cleanupUserEmails: string[] = [];

  try {
    // --------------------------------------------------------------------------
    // SUITE 1: Enterprise Group to Role Mapping Verification
    // --------------------------------------------------------------------------
    console.log("\x1b[35m--- SUITE 1: Enterprise Group to Role Mapping Logic ---\x1b[0m");

    assert(
      "SSO-ROLE-01",
      "Mesh-SuperAdmins maps to SUPERADMIN",
      mapEnterpriseGroupsToRole(["Mesh-SuperAdmins"]) === "SUPERADMIN" &&
        webMapRole(["Mesh-SuperAdmins"]) === "SUPERADMIN",
      "SUPERADMIN",
      mapEnterpriseGroupsToRole(["Mesh-SuperAdmins"])
    );

    assert(
      "SSO-ROLE-02",
      "Global-Admins maps to SUPERADMIN (case-insensitive)",
      mapEnterpriseGroupsToRole(["global-admins"]) === "SUPERADMIN" &&
        webMapRole(["GLOBAL-ADMINS"]) === "SUPERADMIN",
      "SUPERADMIN",
      mapEnterpriseGroupsToRole(["global-admins"])
    );

    assert(
      "SSO-ROLE-03",
      "SupplyChain-Directors maps to ADMIN",
      mapEnterpriseGroupsToRole(["SupplyChain-Directors"]) === "ADMIN" &&
        webMapRole(["SupplyChain-Directors"]) === "ADMIN",
      "ADMIN",
      mapEnterpriseGroupsToRole(["SupplyChain-Directors"])
    );

    assert(
      "SSO-ROLE-04",
      "Plant-Managers maps to ADMIN",
      mapEnterpriseGroupsToRole(["Plant-Managers"]) === "ADMIN" &&
        webMapRole(["Plant-Managers"]) === "ADMIN",
      "ADMIN",
      mapEnterpriseGroupsToRole(["Plant-Managers"])
    );

    assert(
      "SSO-ROLE-05",
      "Mesh-Admins maps to ADMIN",
      mapEnterpriseGroupsToRole(["Mesh-Admins"]) === "ADMIN" &&
        webMapRole(["Mesh-Admins"]) === "ADMIN",
      "ADMIN",
      mapEnterpriseGroupsToRole(["Mesh-Admins"])
    );

    assert(
      "SSO-ROLE-06",
      "Warehouse-Supervisors maps to MANAGER",
      mapEnterpriseGroupsToRole(["Warehouse-Supervisors"]) === "MANAGER" &&
        webMapRole(["Warehouse-Supervisors"]) === "MANAGER",
      "MANAGER",
      mapEnterpriseGroupsToRole(["Warehouse-Supervisors"])
    );

    assert(
      "SSO-ROLE-07",
      "Logistics-Leads maps to MANAGER",
      mapEnterpriseGroupsToRole(["Logistics-Leads"]) === "MANAGER" &&
        webMapRole(["Logistics-Leads"]) === "MANAGER",
      "MANAGER",
      mapEnterpriseGroupsToRole(["Logistics-Leads"])
    );

    assert(
      "SSO-ROLE-08",
      "Standard or empty groups default to EMPLOYEE",
      mapEnterpriseGroupsToRole(["Floor-Workers"]) === "EMPLOYEE" &&
        mapEnterpriseGroupsToRole([]) === "EMPLOYEE" &&
        webMapRole([]) === "EMPLOYEE",
      "EMPLOYEE",
      mapEnterpriseGroupsToRole([])
    );

    // --------------------------------------------------------------------------
    // SUITE 2: Domain to Tenant Helper Verification
    // --------------------------------------------------------------------------
    console.log("\n\x1b[35m--- SUITE 2: Corporate Domain Extraction & Mapping ---\x1b[0m");

    assert(
      "SSO-DOM-01",
      "Extract domain from valid email address",
      extractDomainFromEmail("alex.cross@pacific.apexlogistics.com") === "pacific.apexlogistics.com",
      "pacific.apexlogistics.com",
      extractDomainFromEmail("alex.cross@pacific.apexlogistics.com")
    );

    assert(
      "SSO-DOM-02",
      "Extract domain handles uppercase and trim",
      extractDomainFromEmail("  JANE@NORDIC.SE  ") === "nordic.se",
      "nordic.se",
      extractDomainFromEmail("  JANE@NORDIC.SE  ")
    );

    // --------------------------------------------------------------------------
    // SUITE 3: JIT Provisioning API Validation & Creation
    // --------------------------------------------------------------------------
    console.log("\n\x1b[35m--- SUITE 3: POST /api/auth/sso/provision Validation & Provisioning ---\x1b[0m");

    // 3.1 Input Validation (Missing email)
    {
      const res = await fetchApi("/api/auth/sso/provision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Invalid User" }),
      });
      assert(
        "SSO-VAL-01",
        "Reject SSO provision request missing email with 400 Bad Request",
        res.status === 400,
        400,
        res.status
      );
    }

    // 3.2 JIT User Provisioning for New Corporate User (Azure AD / Entra ID)
    const newEntraEmail = `jit.director.${Date.now()}@pacific.apexlogistics.com`;
    cleanupUserEmails.push(newEntraEmail);

    let entraProvisionToken = "";
    let entraProvisionUser: any = null;

    {
      const res = await fetchApi("/api/auth/sso/provision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: newEntraEmail,
          name: "Dr. Marcus Vance",
          provider: "azure-ad",
          providerAccountId: "entra-guid-98124",
          groups: ["SupplyChain-Directors", "Operations-EMEA"],
          corporateDomain: "pacific.apexlogistics.com",
        }),
      });

      const body = (await res.json()) as any;
      entraProvisionToken = body.authToken;
      entraProvisionUser = body.user;

      assert(
        "SSO-JIT-01",
        "JIT provision new user returns 201 Created with isNewUser: true",
        res.status === 201 && body.isNewUser === true,
        { status: 201, isNewUser: true },
        { status: res.status, isNewUser: body.isNewUser }
      );

      assert(
        "SSO-JIT-02",
        "Provisioned user has mapped role ADMIN from SupplyChain-Directors",
        entraProvisionUser?.userRole === "ADMIN",
        "ADMIN",
        entraProvisionUser?.userRole
      );

      assert(
        "SSO-JIT-03",
        "Provisioned user is correctly associated with company Apex Pacific Freight Corp",
        entraProvisionUser?.company?.companyDomain === "pacific.apexlogistics.com",
        "pacific.apexlogistics.com",
        entraProvisionUser?.company?.companyDomain
      );

      assert(
        "SSO-JIT-04",
        "Provisioned response contains safe user fields without password hash",
        entraProvisionUser?.userPassword === undefined && entraProvisionUser?.userId !== undefined,
        true,
        entraProvisionUser?.userPassword === undefined
      );

      assert(
        "SSO-JIT-05",
        "Provisioned response includes signed JWT authToken",
        typeof entraProvisionToken === "string" && entraProvisionToken.length > 20,
        true,
        Boolean(entraProvisionToken)
      );
    }

    // 3.3 Verify Authenticity of Generated JWT authToken
    {
      const decoded: any = jwt.verify(entraProvisionToken, getJwtSecret());
      assert(
        "SSO-JWT-01",
        "Generated authToken verifies cleanly with platform JWT secret",
        decoded?.user?.userEmail === newEntraEmail && decoded?.user?.userRole === "ADMIN",
        { email: newEntraEmail, role: "ADMIN" },
        { email: decoded?.user?.userEmail, role: decoded?.user?.userRole }
      );
    }

    // 3.4 Access Protected Endpoints with Provisioned authToken
    {
      const res = await fetchApi("/api/auth/getAll", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${entraProvisionToken}`,
          "Content-Type": "application/json",
        },
      });

      assert(
        "SSO-AUTH-01",
        "Provisioned ADMIN user can authenticate and access /api/auth/getAll",
        res.status === 200,
        200,
        res.status
      );
    }

    // --------------------------------------------------------------------------
    // SUITE 4: Existing User Re-login & Role Elevation via SSO
    // --------------------------------------------------------------------------
    console.log("\n\x1b[35m--- SUITE 4: Existing User Re-login & Role Elevation ---\x1b[0m");

    {
      const res = await fetchApi("/api/auth/sso/provision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: newEntraEmail,
          name: "Dr. Marcus Vance (Promoted Global SuperAdmin)",
          provider: "azure-ad",
          providerAccountId: "entra-guid-98124",
          groups: ["Global-Admins"],
          corporateDomain: "pacific.apexlogistics.com",
        }),
      });

      const body = (await res.json()) as any;

      assert(
        "SSO-UPD-01",
        "Re-authenticating existing user returns 200 OK with isNewUser: false",
        res.status === 200 && body.isNewUser === false,
        { status: 200, isNewUser: false },
        { status: res.status, isNewUser: body.isNewUser }
      );

      assert(
        "SSO-UPD-02",
        "Existing user role dynamically elevates to SUPERADMIN based on Global-Admins group",
        body.user?.userRole === "SUPERADMIN",
        "SUPERADMIN",
        body.user?.userRole
      );

      assert(
        "SSO-UPD-03",
        "Existing user userName is updated",
        body.user?.userName === "Dr. Marcus Vance (Promoted Global SuperAdmin)",
        "Dr. Marcus Vance (Promoted Global SuperAdmin)",
        body.user?.userName
      );

      assert(
        "SSO-UPD-04",
        "Existing user lastLogin timestamp is updated",
        body.user?.lastLogin !== null && typeof body.user?.lastLogin === "string",
        true,
        Boolean(body.user?.lastLogin)
      );
    }

    // --------------------------------------------------------------------------
    // SUITE 5: Okta Provider JIT Provisioning & Multi-Tenant Fallback
    // --------------------------------------------------------------------------
    console.log("\n\x1b[35m--- SUITE 5: Okta Provider & Unmatched Domain Fallback ---\x1b[0m");

    const oktaUserEmail = `okta.operator.${Date.now()}@unregistered-vendor.com`;
    cleanupUserEmails.push(oktaUserEmail);

    {
      const res = await fetchApi("/api/auth/sso/provision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: oktaUserEmail,
          name: "Taylor Swift",
          provider: "okta",
          providerAccountId: "okta-uid-10293",
          groups: ["Logistics-Leads"],
          corporateDomain: "unregistered-vendor.com",
        }),
      });

      const body = (await res.json()) as any;

      assert(
        "SSO-OKTA-01",
        "Okta JIT provisioning succeeds with 201 Created",
        res.status === 201 && body.isNewUser === true,
        201,
        res.status
      );

      assert(
        "SSO-OKTA-02",
        "Okta user maps to MANAGER role from Logistics-Leads group",
        body.user?.userRole === "MANAGER",
        "MANAGER",
        body.user?.userRole
      );

      assert(
        "SSO-OKTA-03",
        "Unregistered corporate domain gracefully falls back to default tenant company",
        body.user?.companyId !== null && body.user?.company !== null,
        true,
        Boolean(body.user?.companyId)
      );
    }
  } finally {
    // Teardown ephemeral test users
    if (cleanupUserEmails.length > 0) {
      console.log("\n[*] Cleaning up ephemeral SSO test users...");
      await prisma.user.deleteMany({
        where: { userEmail: { in: cleanupUserEmails } },
      });
      console.log("Cleanup complete.");
    }
  }

  // --------------------------------------------------------------------------
  // SUMMARY
  // --------------------------------------------------------------------------
  const total = testResults.length;
  const passed = testResults.filter((r) => r.passed).length;
  const failed = total - passed;

  console.log("\n================================================================================");
  console.log(` SSO INTEGRATION & JIT PROVISIONING SUMMARY: ${passed}/${total} PASSED (${((passed / total) * 100).toFixed(1)}%)`);
  console.log("================================================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runSsoJitSuite().catch((err) => {
  console.error("FATAL ERROR IN SSO JIT TEST SUITE:", err);
  process.exit(1);
});
