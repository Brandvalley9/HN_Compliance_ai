import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  Firestore,
} from 'firebase/firestore';

const PROJECT_ID = 'demo-hypenex-compliance-test';

interface TestResult {
  number: number;
  name: string;
  passed: boolean;
  details?: string;
  error?: string;
}

const results: TestResult[] = [];

async function runTestSuite() {
  console.log('===============================================================');
  console.log('  HypeNex Compliance Intelligence - "Dirty Dozen" Security Tests');
  console.log('  Testing RBAC & Data Invariants from security_spec.md');
  console.log('===============================================================\n');

  const rulesPath = resolve(process.cwd(), 'firestore.rules');
  const rulesContent = readFileSync(rulesPath, 'utf8');

  const [emuHost, emuPortStr] = (process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8088').split(':');
  const emuPort = parseInt(emuPortStr, 10) || 8088;

  // Initialize test environment
  const testEnv: RulesTestEnvironment = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      rules: rulesContent,
      host: emuHost,
      port: emuPort,
    },
  });

  try {
    // Reset data
    await testEnv.clearFirestore();

    // Seed baseline data with security rules disabled
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const adminDb = context.firestore();

      // Seed Users
      await setDoc(doc(adminDb, 'users', 'campaigner_alice'), {
        role: 'campaigner',
        email: 'alice@hypenex.com',
        displayName: 'Alice Campaigner',
      });
      await setDoc(doc(adminDb, 'users', 'campaigner_bob'), {
        role: 'campaigner',
        email: 'bob@hypenex.com',
        displayName: 'Bob Campaigner',
      });
      await setDoc(doc(adminDb, 'users', 'creator_charlie'), {
        role: 'creator',
        email: 'charlie@creator.com',
        displayName: 'Charlie Creator',
      });
      await setDoc(doc(adminDb, 'users', 'creator_dave'), {
        role: 'creator',
        email: 'dave@creator.com',
        displayName: 'Dave Creator',
      });
      await setDoc(doc(adminDb, 'users', 'reviewer_eve'), {
        role: 'reviewer',
        email: 'eve@reviewer.com',
        displayName: 'Eve Reviewer',
      });

      // Seed Campaigns
      // Campaign 1: Owned by Alice, assigned only to Charlie
      await setDoc(doc(adminDb, 'campaigns', 'c1'), {
        name: 'Summer Glow Skincare',
        ownerId: 'campaigner_alice',
        ownerEmail: 'alice@hypenex.com',
        assignedCreators: ['creator_charlie'],
        instructions: 'Focus on natural ingredients',
        productType: 'cosmetics',
        targetAudience: '18-35',
        platforms: ['instagram', 'tiktok'],
      });

      // Campaign 2: Owned by Bob, assigned to Dave
      await setDoc(doc(adminDb, 'campaigns', 'c2'), {
        name: 'HydroBoost Beverage',
        ownerId: 'campaigner_bob',
        ownerEmail: 'bob@hypenex.com',
        assignedCreators: ['creator_dave'],
        instructions: 'Emphasize electrolytes',
        productType: 'food_beverage',
        targetAudience: 'athletes',
        platforms: ['youtube'],
      });

      // Seed Regulatory Entries
      await setDoc(doc(adminDb, 'regulatory_entries', 'reg_ftc_1'), {
        source: 'FTC',
        documentName: 'Guides Concerning Use of Endorsements',
        sectionRef: '16 CFR § 255.5',
        summary: 'Clear and conspicuous disclosure of material connections.',
      });

      // Seed Compliance Reports
      // Report 1: For Campaign 1, submitted by Charlie
      await setDoc(doc(adminDb, 'compliance_reports', 'rep_c1_charlie'), {
        campaignId: 'c1',
        creatorId: 'creator_charlie',
        submittedContentText: 'I love this serum! Ad #sponsored',
        deterministicFindings: [
          { ruleId: 'rule-ftc-clear-conspicuous', status: 'PASS' },
        ],
        matchedRegulatoryEntries: ['reg_ftc_1'],
        aiReasoning: {
          overall_status: 'GREEN',
          summary: 'Complies with disclosure guides.',
        },
        createdAt: new Date().toISOString(),
      });

      // Report 2: For Campaign 2 (Bob's campaign), submitted by Dave
      await setDoc(doc(adminDb, 'compliance_reports', 'rep_c2_dave'), {
        campaignId: 'c2',
        creatorId: 'creator_dave',
        submittedContentText: 'Drinking HydroBoost daily!',
        deterministicFindings: [],
        matchedRegulatoryEntries: [],
        aiReasoning: {
          overall_status: 'AMBER',
          summary: 'Missing explicit brand partnership tag.',
        },
        createdAt: new Date().toISOString(),
      });

      // Seed Audit Trail in Campaign 1
      await setDoc(doc(adminDb, 'campaigns', 'c1', 'audit_trail', 'v1'), {
        campaignId: 'c1',
        versionNumber: 1,
        creatorId: 'creator_charlie',
        submittedContentText: 'I love this serum! Ad #sponsored',
        finalApprovalStatus: 'PENDING_REVIEW',
      });
    });

    console.log('✔ Baseline data seeded successfully into emulator.\n');

    // User contexts
    const aliceDb = testEnv.authenticatedContext('campaigner_alice').firestore();
    const bobDb = testEnv.authenticatedContext('campaigner_bob').firestore();
    const charlieDb = testEnv.authenticatedContext('creator_charlie').firestore();
    const daveDb = testEnv.authenticatedContext('creator_dave').firestore();
    const eveDb = testEnv.authenticatedContext('reviewer_eve').firestore();
    const unauthDb = testEnv.unauthenticatedContext().firestore();

    // -------------------------------------------------------------
    // Test 1: Creator attempting to create a Campaign (DENIED)
    // -------------------------------------------------------------
    try {
      await assertFails(
        setDoc(doc(charlieDb, 'campaigns', 'c_illegal_creator'), {
          name: 'Unauthorized Creator Campaign',
          ownerId: 'creator_charlie',
          instructions: 'Should fail',
        })
      );
      results.push({
        number: 1,
        name: 'Creator attempting to create a Campaign (`create /campaigns/c1` by Creator) -> DENIED',
        passed: true,
        details: 'Creator Charlie was denied permission to create a campaign document.',
      });
    } catch (err: any) {
      results.push({
        number: 1,
        name: 'Creator attempting to create a Campaign (`create /campaigns/c1` by Creator) -> DENIED',
        passed: false,
        error: err.message,
      });
    }

    // -------------------------------------------------------------
    // Test 2: Reviewer attempting to update Campaign instructions (DENIED)
    // -------------------------------------------------------------
    try {
      await assertFails(
        updateDoc(doc(eveDb, 'campaigns', 'c1'), {
          instructions: 'Reviewer tampered campaign brief',
        })
      );
      results.push({
        number: 2,
        name: 'Reviewer attempting to update Campaign instructions (`update /campaigns/c1` by Reviewer) -> DENIED',
        passed: true,
        details: 'Reviewer Eve was denied permission to update campaign instructions.',
      });
    } catch (err: any) {
      results.push({
        number: 2,
        name: 'Reviewer attempting to update Campaign instructions (`update /campaigns/c1` by Reviewer) -> DENIED',
        passed: false,
        error: err.message,
      });
    }

    // -------------------------------------------------------------
    // Test 3: Campaigner attempting to delete another Campaigner's Campaign (DENIED)
    // -------------------------------------------------------------
    try {
      // Bob tries to delete Alice's campaign c1
      await assertFails(deleteDoc(doc(bobDb, 'campaigns', 'c1')));
      results.push({
        number: 3,
        name: "Campaigner attempting to delete another Campaigner's Campaign -> DENIED",
        passed: true,
        details: "Campaigner Bob was denied deleting Alice's campaign c1.",
      });
    } catch (err: any) {
      results.push({
        number: 3,
        name: "Campaigner attempting to delete another Campaigner's Campaign -> DENIED",
        passed: false,
        error: err.message,
      });
    }

    // -------------------------------------------------------------
    // Test 4: Creator attempting to read an unassigned Campaign where assignedCreators does not include them (DENIED)
    // -------------------------------------------------------------
    try {
      // Dave is NOT in c1's assignedCreators (only Charlie is)
      await assertFails(getDoc(doc(daveDb, 'campaigns', 'c1')));
      results.push({
        number: 4,
        name: 'Creator attempting to read an unassigned Campaign where assignedCreators does not include them -> DENIED',
        passed: true,
        details: 'Creator Dave was denied reading campaign c1 where assignedCreators = ["creator_charlie"].',
      });
    } catch (err: any) {
      results.push({
        number: 4,
        name: 'Creator attempting to read an unassigned Campaign where assignedCreators does not include them -> DENIED',
        passed: false,
        error: err.message,
      });
    }

    // -------------------------------------------------------------
    // Test 5: Non-reviewer (Campaigner or Creator) attempting to create or edit a Regulatory Entry (DENIED)
    // -------------------------------------------------------------
    try {
      // 5a: Campaigner Alice attempting to create regulatory entry
      await assertFails(
        setDoc(doc(aliceDb, 'regulatory_entries', 'reg_fake'), {
          source: 'Custom',
          documentName: 'Fake Guideline',
          sectionRef: 'Section 1',
          summary: 'Should be blocked',
        })
      );
      // 5b: Creator Charlie attempting to edit existing regulatory entry
      await assertFails(
        updateDoc(doc(charlieDb, 'regulatory_entries', 'reg_ftc_1'), {
          summary: 'Tampered regulation',
        })
      );
      results.push({
        number: 5,
        name: 'Non-reviewer (Campaigner or Creator) attempting to create or edit a Regulatory Entry -> DENIED',
        passed: true,
        details: 'Both Campaigner create and Creator update on regulatory entries were denied.',
      });
    } catch (err: any) {
      results.push({
        number: 5,
        name: 'Non-reviewer (Campaigner or Creator) attempting to create or edit a Regulatory Entry -> DENIED',
        passed: false,
        error: err.message,
      });
    }

    // -------------------------------------------------------------
    // Test 6: Creator attempting to submit a Compliance Report for a different creatorId (DENIED)
    // -------------------------------------------------------------
    try {
      // Charlie attempting to create a report with creatorId: 'creator_dave'
      await assertFails(
        setDoc(doc(charlieDb, 'compliance_reports', 'rep_spoofed'), {
          campaignId: 'c1',
          creatorId: 'creator_dave', // Spoofed creatorId
          submittedContentText: 'Unauthorized spoofed post',
        })
      );
      results.push({
        number: 6,
        name: 'Creator attempting to submit a Compliance Report for a different creatorId (creatorId != request.auth.uid) -> DENIED',
        passed: true,
        details: 'Charlie was denied creating a compliance report with creatorId="creator_dave".',
      });
    } catch (err: any) {
      results.push({
        number: 6,
        name: 'Creator attempting to submit a Compliance Report for a different creatorId (creatorId != request.auth.uid) -> DENIED',
        passed: false,
        error: err.message,
      });
    }

    // -------------------------------------------------------------
    // Test 7: Campaigner attempting to read Compliance Reports for another campaigner's campaign (DENIED)
    // -------------------------------------------------------------
    try {
      // Alice owns c1. rep_c2_dave belongs to c2 (owned by Bob). Alice must be denied.
      await assertFails(getDoc(doc(aliceDb, 'compliance_reports', 'rep_c2_dave')));
      results.push({
        number: 7,
        name: "Campaigner attempting to read Compliance Reports for another campaigner's campaign -> DENIED",
        passed: true,
        details: "Alice was denied reading rep_c2_dave belonging to Bob's campaign c2.",
      });
    } catch (err: any) {
      results.push({
        number: 7,
        name: "Campaigner attempting to read Compliance Reports for another campaigner's campaign -> DENIED",
        passed: false,
        error: err.message,
      });
    }

    // -------------------------------------------------------------
    // Test 8: Reviewer attempting to overwrite aiReasoning, deterministicFindings, or submittedContentText when recording a decision (DENIED)
    // -------------------------------------------------------------
    try {
      // 8a: Reviewer Eve attempts to overwrite aiReasoning
      await assertFails(
        updateDoc(doc(eveDb, 'compliance_reports', 'rep_c1_charlie'), {
          reviewerDecision: { decision: 'APPROVED', comment: 'Approved' },
          aiReasoning: { overall_status: 'OVERWRITTEN' },
        })
      );
      // 8b: Reviewer Eve attempts to alter submittedContentText
      await assertFails(
        updateDoc(doc(eveDb, 'compliance_reports', 'rep_c1_charlie'), {
          submittedContentText: 'Altered creator submission',
        })
      );
      // 8c: Reviewer Eve attempts to alter deterministicFindings
      await assertFails(
        updateDoc(doc(eveDb, 'compliance_reports', 'rep_c1_charlie'), {
          deterministicFindings: [{ ruleId: 'forged', status: 'PASS' }],
        })
      );
      results.push({
        number: 8,
        name: 'Reviewer attempting to overwrite aiReasoning, deterministicFindings, or submittedContentText when recording a decision -> DENIED',
        passed: true,
        details: 'Reviewer Eve was prevented from tampering with immutable audit fields (aiReasoning, findings, content).',
      });
    } catch (err: any) {
      results.push({
        number: 8,
        name: 'Reviewer attempting to overwrite aiReasoning, deterministicFindings, or submittedContentText when recording a decision -> DENIED',
        passed: false,
        error: err.message,
      });
    }

    // -------------------------------------------------------------
    // Test 9: Creator attempting to modify or erase a Compliance Report after submission (DENIED)
    // -------------------------------------------------------------
    try {
      // 9a: Creator Charlie attempting to update their own submitted report
      await assertFails(
        updateDoc(doc(charlieDb, 'compliance_reports', 'rep_c1_charlie'), {
          submittedContentText: 'Post-submission edit',
        })
      );
      // 9b: Creator Charlie attempting to delete their report
      await assertFails(
        deleteDoc(doc(charlieDb, 'compliance_reports', 'rep_c1_charlie'))
      );
      results.push({
        number: 9,
        name: 'Creator attempting to modify or erase a Compliance Report after submission -> DENIED',
        passed: true,
        details: 'Creator Charlie was denied updating and deleting their submitted compliance report.',
      });
    } catch (err: any) {
      results.push({
        number: 9,
        name: 'Creator attempting to modify or erase a Compliance Report after submission -> DENIED',
        passed: false,
        error: err.message,
      });
    }

    // -------------------------------------------------------------
    // Test 10: Any user attempting to update an existing Audit Trail version document (DENIED)
    // -------------------------------------------------------------
    try {
      // Alice (campaign owner) tries to update audit version
      await assertFails(
        updateDoc(doc(aliceDb, 'campaigns', 'c1', 'audit_trail', 'v1'), {
          finalApprovalStatus: 'TAMPERED',
        })
      );
      // Charlie (creator) tries to update audit version
      await assertFails(
        updateDoc(doc(charlieDb, 'campaigns', 'c1', 'audit_trail', 'v1'), {
          submittedContentText: 'Rewritten history',
        })
      );
      // Eve (reviewer) tries to update audit version
      await assertFails(
        updateDoc(doc(eveDb, 'campaigns', 'c1', 'audit_trail', 'v1'), {
          finalApprovalStatus: 'FORCE_APPROVED',
        })
      );
      results.push({
        number: 10,
        name: 'Any user attempting to update an existing Audit Trail version document (`update /campaigns/c1/audit_trail/v1`) -> DENIED',
        passed: true,
        details: 'Campaigner, Creator, and Reviewer updates to audit_trail/v1 were all blocked (immutable log).',
      });
    } catch (err: any) {
      results.push({
        number: 10,
        name: 'Any user attempting to update an existing Audit Trail version document (`update /campaigns/c1/audit_trail/v1`) -> DENIED',
        passed: false,
        error: err.message,
      });
    }

    // -------------------------------------------------------------
    // Test 11: Any user attempting to delete an Audit Trail entry (DENIED)
    // -------------------------------------------------------------
    try {
      // Alice (campaign owner) tries to delete audit version
      await assertFails(
        deleteDoc(doc(aliceDb, 'campaigns', 'c1', 'audit_trail', 'v1'))
      );
      // Charlie (creator) tries to delete audit version
      await assertFails(
        deleteDoc(doc(charlieDb, 'campaigns', 'c1', 'audit_trail', 'v1'))
      );
      // Eve (reviewer) tries to delete audit version
      await assertFails(
        deleteDoc(doc(eveDb, 'campaigns', 'c1', 'audit_trail', 'v1'))
      );
      results.push({
        number: 11,
        name: 'Any user attempting to delete an Audit Trail entry -> DENIED',
        passed: true,
        details: 'Audit trail deletion is permanently forbidden for all user roles.',
      });
    } catch (err: any) {
      results.push({
        number: 11,
        name: 'Any user attempting to delete an Audit Trail entry -> DENIED',
        passed: false,
        error: err.message,
      });
    }

    // -------------------------------------------------------------
    // Test 12: Unauthenticated user attempting to read any campaigns, reports, regulatory entries, or audit trails (DENIED)
    // -------------------------------------------------------------
    try {
      // 12a: Unauthenticated read on campaign
      await assertFails(getDoc(doc(unauthDb, 'campaigns', 'c1')));
      // 12b: Unauthenticated read on compliance report
      await assertFails(getDoc(doc(unauthDb, 'compliance_reports', 'rep_c1_charlie')));
      // 12c: Unauthenticated read on regulatory entries
      await assertFails(getDoc(doc(unauthDb, 'regulatory_entries', 'reg_ftc_1')));
      // 12d: Unauthenticated read on audit trail
      await assertFails(getDoc(doc(unauthDb, 'campaigns', 'c1', 'audit_trail', 'v1')));
      // 12e: Unauthenticated read on users
      await assertFails(getDoc(doc(unauthDb, 'users', 'campaigner_alice')));

      results.push({
        number: 12,
        name: 'Unauthenticated user attempting to read any campaigns, reports, regulatory entries, or audit trails -> DENIED',
        passed: true,
        details: 'Unauthenticated client was blocked from reading campaigns, reports, regulations, audit logs, and users.',
      });
    } catch (err: any) {
      results.push({
        number: 12,
        name: 'Unauthenticated user attempting to read any campaigns, reports, regulatory entries, or audit trails -> DENIED',
        passed: false,
        error: err.message,
      });
    }

    // -------------------------------------------------------------
    // Bonus Affirmation Tests (Ensuring valid RBAC operations SUCCEED)
    // -------------------------------------------------------------
    console.log('\n--- Running Sanity Checks for Legitimate Operations ---');
    // Alice (campaigner) can read her own campaign
    await assertSucceeds(getDoc(doc(aliceDb, 'campaigns', 'c1')));
    console.log('✔ Positive check 1: Campaigner Alice successfully read her own campaign.');

    // Charlie (assigned creator) can read assigned campaign c1
    await assertSucceeds(getDoc(doc(charlieDb, 'campaigns', 'c1')));
    console.log('✔ Positive check 2: Assigned creator Charlie successfully read campaign c1.');

    // Eve (reviewer) can read any campaign
    await assertSucceeds(getDoc(doc(eveDb, 'campaigns', 'c1')));
    await assertSucceeds(getDoc(doc(eveDb, 'campaigns', 'c2')));
    console.log('✔ Positive check 3: Reviewer Eve successfully read campaigns c1 and c2.');

    // Eve (reviewer) can update reviewerDecision only
    await assertSucceeds(
      updateDoc(doc(eveDb, 'compliance_reports', 'rep_c1_charlie'), {
        reviewerDecision: {
          decision: 'APPROVED',
          reviewerId: 'reviewer_eve',
          timestamp: new Date().toISOString(),
        },
      })
    );
    console.log('✔ Positive check 4: Reviewer Eve successfully updated reviewerDecision on report.');

    // Authenticated users can read regulatory entries
    await assertSucceeds(getDoc(doc(charlieDb, 'regulatory_entries', 'reg_ftc_1')));
    console.log('✔ Positive check 5: Authenticated creator successfully read regulatory guidance.');

  } finally {
    // Cleanup
    await testEnv.cleanup();
  }

  // Print Summary Table
  console.log('\n===============================================================');
  console.log('                    TEST RESULTS BREAKDOWN                    ');
  console.log('===============================================================');
  let allPassed = true;
  for (const r of results) {
    const statusMark = r.passed ? '✅ PASSED' : '❌ FAILED';
    if (!r.passed) allPassed = false;
    console.log(`\nCase ${r.number}: [${statusMark}] ${r.name}`);
    if (r.details) console.log(`   Detail: ${r.details}`);
    if (r.error) console.log(`   Error: ${r.error}`);
  }

  console.log('\n---------------------------------------------------------------');
  const passedCount = results.filter((r) => r.passed).length;
  console.log(`Total Dirty Dozen Tests: ${results.length}`);
  console.log(`Passed: ${passedCount} / ${results.length}`);
  console.log(`Failed: ${results.length - passedCount} / ${results.length}`);
  console.log('===============================================================\n');

  if (!allPassed || results.length !== 12) {
    console.error('❌ Test suite completed with failures.');
    process.exit(1);
  } else {
    console.log('🎉 ALL 12 DIRTY DOZEN TEST CASES PASSED SUCCESSFULLY!');
    process.exit(0);
  }
}

runTestSuite().catch((err) => {
  console.error('Fatal error running test suite:', err);
  process.exit(1);
});
