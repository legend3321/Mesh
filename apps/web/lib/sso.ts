/**
 * Enterprise SSO SAML 2.0 / OIDC Identity Claims Interface
 */
export interface EnterpriseSsoProfile {
  sub?: string;
  id?: string;
  email?: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  preferred_username?: string;
  upn?: string;
  groups?: string[] | string;
  roles?: string[] | string;
  wids?: string[] | string; // Azure AD Directory Role Template IDs
  ext_groups?: string[] | string;
  [key: string]: any;
}

/**
 * Enterprise SAML 2.0 / OIDC Identity Provider Configuration Interface
 */
export interface EnterpriseOidcConfig {
  clientId: string;
  clientSecret: string;
  tenantId?: string;
  issuer?: string;
  domain?: string;
}

/**
 * Enterprise Group to Mesh Role Mapping:
 * - If groups include "Mesh-SuperAdmins" or "Global-Admins" -> role = "SUPERADMIN"
 * - If groups include "Mesh-Admins", "SupplyChain-Directors", or "Plant-Managers" -> role = "ADMIN"
 * - If groups include "Mesh-Managers", "Warehouse-Supervisors", or "Logistics-Leads" -> role = "MANAGER"
 * - Otherwise -> role = "EMPLOYEE"
 */
export function mapEnterpriseGroupsToRole(
  groups: string[] = []
): "SUPERADMIN" | "ADMIN" | "MANAGER" | "EMPLOYEE" {
  if (!Array.isArray(groups) || groups.length === 0) {
    return "EMPLOYEE";
  }
  const normalized = groups.map((g) => (typeof g === "string" ? g.trim().toLowerCase() : ""));

  const superAdminKeywords = ["mesh-superadmins", "global-admins"];
  const adminKeywords = ["mesh-admins", "supplychain-directors", "plant-managers"];
  const managerKeywords = ["mesh-managers", "warehouse-supervisors", "logistics-leads"];

  if (normalized.some((g) => superAdminKeywords.includes(g))) {
    return "SUPERADMIN";
  }
  if (normalized.some((g) => adminKeywords.includes(g))) {
    return "ADMIN";
  }
  if (normalized.some((g) => managerKeywords.includes(g))) {
    return "MANAGER";
  }
  return "EMPLOYEE";
}

/**
 * Domain to Tenant Mapping helper
 * Extracts corporate email domain to map users to their organizational company tenant.
 */
export function extractDomainFromEmail(email: string): string {
  if (!email || !email.includes("@")) return "";
  return email.split("@")[1].trim().toLowerCase();
}
