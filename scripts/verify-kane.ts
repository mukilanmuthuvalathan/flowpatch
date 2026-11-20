import fs from 'node:fs';
import path from 'node:path';
import { executeKaneVerification } from '../src/verification/kaneRunner';
import { TARGET_REDUCER_PATH } from '../src/workspace/patchTemplates';
import { detectCodePatchState } from '../src/workspace/repairEngine';

async function main() {
  const targetUrl = process.env.APP_VERIFY_URL || 'http://localhost:3000';
  const reducerPath = path.resolve(process.cwd(), TARGET_REDUCER_PATH);
  const currentCode = fs.existsSync(reducerPath) ? fs.readFileSync(reducerPath, 'utf8') : '';
  const codeState = detectCodePatchState(currentCode, false);

  console.log('================================================================');
  console.log('FlowPatch — Kane CLI Browser Flow Verification');
  console.log(`Flow file : flows/task_board_flow_test.md`);
  console.log(`Target URL: ${targetUrl}`);
  console.log(`Code state: ${codeState}`);
  console.log('================================================================\n');

  const result = await executeKaneVerification({
    runNumber: 1,
    targetUrl,
    codeStateAtRun: codeState,
  });

  console.log(`Kane CLI Binary : ${result.cliDiagnostics.binaryPath} (v${result.cliDiagnostics.version})`);
  console.log(`Command         : ${result.cliDiagnostics.commandExecuted}`);
  if (result.cliDiagnostics.authGuidance) {
    console.log(`Note            : ${result.cliDiagnostics.authGuidance}`);
  }
  console.log('\nStep Results:');
  for (const step of result.steps) {
    const badge =
      step.status === 'passed'
        ? '[PASS]'
        : step.status === 'failed'
        ? '[FAIL]'
        : '[SKIP]';
    console.log(`  ${badge} Step ${step.stepIndex}: ${step.heading} (${step.durationMs}ms)`);
    console.log(`         ${step.remark}`);
    if (step.domObservation) {
      console.log(`         DOM: ${step.domObservation}`);
    }
    if (step.failureReason) {
      console.log(`         ERROR: ${step.failureReason}`);
    }
  }

  console.log('\n----------------------------------------------------------------');
  console.log(`Overall Verdict : ${result.overallStatus.toUpperCase()} (${result.durationMs}ms)`);
  console.log(`Saved Run Record: ${result.savedArtifactPath}`);
  console.log('----------------------------------------------------------------');

  process.exit(result.overallStatus === 'passed' ? 0 : 1);
}

main().catch((err) => {
  console.error('Verification runner failed:', err);
  process.exit(1);
});
