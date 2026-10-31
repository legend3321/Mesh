import { runEnterpriseE2ESuite } from "./enterprise_e2e_functional_suite";

runEnterpriseE2ESuite()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("FATAL ERROR IN FUNCTIONAL QA SUITE:", err);
    process.exit(1);
  });
