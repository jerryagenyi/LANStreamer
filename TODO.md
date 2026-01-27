# LANStreamer - Regression Analysis & Fix TODO

**Last Updated:** 2026-01-26  
**Based on:** ERROR_DIAGNOSTICS_ANALYSIS_REPORT.md  
**Issue:** Regression from v1.2.0 (working) → v1.2.2 (working with errors) → v1.2.3 (less functional)

---

## 🚨 CRITICAL ISSUES IDENTIFIED

### Issue 1: Pattern Matching Race Condition (HIGH PRIORITY)
**Location:** `src/utils/errorDiagnostics.js` Lines 234-240

**Problem:** First-match-wins logic - if error matches multiple patterns, only first category triggers. This can cause **error misclassification** between versions.

**Impact:** Same errors could be misdiagnosed, leading to wrong troubleshooting paths and making streams appear broken when they're just miscategorized.

**Tasks:**
- [ ] Compare pattern order changes across versions
  ```bash
  git diff v1.2.0 v1.2.2 -- src/utils/errorDiagnostics.js | grep -A 5 -B 5 "errorPatterns"
  git diff v1.2.2 v1.2.3 -- src/utils/errorDiagnostics.js | grep -A 5 -B 5 "errorPatterns"
  ```
- [ ] Extract pattern order from each version
  ```bash
  git show v1.2.0:src/utils/errorDiagnostics.js | grep -n "patterns:" > v1.2.0_patterns.txt
  git show v1.2.2:src/utils/errorDiagnostics.js | grep -n "patterns:" > v1.2.2_patterns.txt
  git show v1.2.3:src/utils/errorDiagnostics.js | grep -n "patterns:" > v1.2.3_patterns.txt
  ```
- [ ] If pattern order changed, **STOP HERE - this is the bug**
- [ ] Implement pattern priority scoring system (see report Section 10.1)
- [ ] Add unit tests for pattern matching order

---

### Issue 2: Performance Optimization Missing (MEDIUM PRIORITY)
**Location:** `src/utils/errorDiagnostics.js` Lines 233-241

**Problem:** Sequential pattern testing (O(n*m)) with no early exit after match. All patterns tested even after first match.

**Impact:** Cumulative delay in error detection could cause streams to timeout before diagnostics complete.

**Tasks:**
- [ ] Verify if v1.2.2/v1.2.3 added more patterns (check pattern count)
- [ ] Implement early exit optimization (already returns, but verify loop efficiency)
- [ ] Add pattern compilation in constructor (pre-compile regex patterns)
- [ ] Consider error caching for repeated diagnoses

---

## 🔍 VERSION COMPARISON STRATEGY

### Phase 1: Create Analysis Branch & Setup
- [ ] Create analysis branch
  ```bash
  git checkout -b analysis/regression-v1.2.0-to-v1.2.3
  git stash save "Current unstable state"
  ```
- [ ] Create analysis output directory
  ```bash
  mkdir -p analysis_output
  ```

### Phase 2: Generate Full File Comparisons
- [ ] Generate file stat comparisons
  ```bash
  git diff v1.2.0 v1.2.2 --stat > analysis_output/CHANGES_1.2.0_to_1.2.2_STAT.txt
  git diff v1.2.2 v1.2.3 --stat > analysis_output/CHANGES_1.2.2_to_1.2.3_STAT.txt
  ```
- [ ] Compare StreamingService.js (primary integration point)
  ```bash
  git diff v1.2.0 v1.2.2 -- src/services/StreamingService.js > analysis_output/diff_StreamingService_1.2.0_1.2.2.patch
  git diff v1.2.2 v1.2.3 -- src/services/StreamingService.js > analysis_output/diff_StreamingService_1.2.2_1.2.3.patch
  git diff v1.2.0 v1.2.3 -- src/services/StreamingService.js > analysis_output/diff_StreamingService_FULL.patch
  ```
- [ ] Compare errorDiagnostics.js (error detection)
  ```bash
  git diff v1.2.0 v1.2.2 -- src/utils/errorDiagnostics.js > analysis_output/diff_errorDiag_1.2.0_1.2.2.patch
  git diff v1.2.2 v1.2.3 -- src/utils/errorDiagnostics.js > analysis_output/diff_errorDiag_1.2.2_1.2.3.patch
  git diff v1.2.0 v1.2.3 -- src/utils/errorDiagnostics.js > analysis_output/diff_errorDiag_FULL.patch
  ```
- [ ] Compare IcecastService.js
  ```bash
  git diff v1.2.0 v1.2.3 -- src/services/IcecastService.js > analysis_output/diff_Icecast_full.patch
  ```
- [ ] Compare FFmpegStreamsManager.js (frontend error display)
  ```bash
  git diff v1.2.0 v1.2.3 -- public/components/FFmpegStreamsManager.js > analysis_output/diff_FFmpegStreamsManager.patch
  ```

### Phase 3: Dependency Analysis
- [ ] Extract package.json from each version
  ```bash
  git show v1.2.0:package.json > analysis_output/package_1.2.0.json
  git show v1.2.2:package.json > analysis_output/package_1.2.2.json
  git show v1.2.3:package.json > analysis_output/package_1.2.3.json
  ```
- [ ] Compare dependencies
  ```bash
  diff analysis_output/package_1.2.0.json analysis_output/package_1.2.2.json > analysis_output/deps_1.2.0_to_1.2.2.txt
  diff analysis_output/package_1.2.2.json analysis_output/package_1.2.3.json > analysis_output/deps_1.2.2_to_1.2.3.txt
  ```
- [ ] Check for breaking dependency updates
  ```bash
  grep -E "express|socket.io|winston|node" analysis_output/deps_*.txt
  ```

### Phase 4: Commit History Analysis
- [ ] Generate commit lists
  ```bash
  git log v1.2.0..v1.2.2 --oneline --pretty=format:"%h %s" > analysis_output/commits_1.2.0_to_1.2.2.txt
  git log v1.2.2..v1.2.3 --oneline --pretty=format:"%h %s" > analysis_output/commits_1.2.2_to_1.2.3.txt
  git log v1.2.0..v1.2.3 --oneline --pretty=format:"%h|%ai|%s" > analysis_output/all_commits.csv
  ```
- [ ] Find commits touching streaming
  ```bash
  git log v1.2.0..v1.2.3 --oneline --grep="stream\|ffmpeg\|icecast" -i > analysis_output/streaming_commits.txt
  ```

### Phase 5: Error Pattern Extraction
- [ ] Extract error patterns from each version
  ```bash
  for version in v1.2.0 v1.2.2 v1.2.3; do
    echo "== $version ==" >> analysis_output/error_patterns_comparison.txt
    git show $version:src/utils/errorDiagnostics.js | grep -A 3 "patterns:" >> analysis_output/error_patterns_comparison.txt
  done
  ```
- [ ] Extract pattern order (category order matters!)
  ```bash
  for version in v1.2.0 v1.2.2 v1.2.3; do
    echo "=== $version ===" >> analysis_output/pattern_order_comparison.txt
    git show $version:src/utils/errorDiagnostics.js | grep -n "{ category:" >> analysis_output/pattern_order_comparison.txt
  done
  ```

---

## 📋 PRIORITY INVESTIGATION ORDER

### Priority 1: StreamingService.js (CRITICAL)
**Integration Points:** Lines 312, 355, 1083

**Tasks:**
- [ ] Check error handling logic changes
  ```bash
  git diff v1.2.0 v1.2.3 -- src/services/StreamingService.js | grep -A 20 -B 5 "diagnose"
  ```
- [ ] Check port detection changes
  ```bash
  git diff v1.2.0 v1.2.3 -- src/services/StreamingService.js | grep -A 10 -B 5 "icecastPort\|actualPort"
  ```
- [ ] Check FFmpeg spawn changes
  ```bash
  git diff v1.2.0 v1.2.3 -- src/services/StreamingService.js | grep -A 15 -B 10 "spawn"
  ```
- [ ] Verify context data passed to diagnostics:
  - [ ] `deviceId` - check if extraction changed
  - [ ] `deviceName` - check if mapping changed
  - [ ] `icecastPort` - check if `actualPort` determination changed
  - [ ] `streamId` - verify still passed correctly
- [ ] Check `safeStderrData` handling (line 1083)
  ```bash
  git diff v1.2.0 v1.2.3 -- src/services/StreamingService.js | grep -A 10 -B 5 "safeStderr\|stderrData"
  ```

### Priority 2: errorDiagnostics.js (CRITICAL)
**Focus Areas:** Lines 33-41 (exit codes), Lines 43-198 (patterns), Lines 250-276 (connection errors)

**Tasks:**
- [ ] Check Windows exit code mapping changes
  ```bash
  git diff v1.2.0 v1.2.3 -- src/utils/errorDiagnostics.js | grep -A 10 "windowsExitCodes"
  ```
- [ ] Check for new error patterns added
  ```bash
  git diff v1.2.0 v1.2.3 -- src/utils/errorDiagnostics.js | grep "patterns:"
  ```
- [ ] Check if context usage changed
  ```bash
  git diff v1.2.0 v1.2.3 -- src/utils/errorDiagnostics.js | grep -B 5 -A 5 "context\."
  ```
- [ ] Verify connection error port handling (Line 251)
  ```bash
  git diff v1.2.0 v1.2.3 -- src/utils/errorDiagnostics.js | grep -A 30 "diagnoseConnectionError"
  ```
- [ ] Check for new crash patterns (0xA7F00008)
  ```bash
  git diff v1.2.0 v1.2.3 -- src/utils/errorDiagnostics.js | grep "0xA7F00008\|2812791304"
  ```

### Priority 3: IcecastService.js
**Key Concerns:** Port detection, startup validation, connection timeout

**Tasks:**
- [ ] Check port detection logic
  ```bash
  git diff v1.2.0 v1.2.3 -- src/services/IcecastService.js | grep -A 20 "detectPort\|getPort\|getActualPort"
  ```
- [ ] Check Icecast startup changes
  ```bash
  git diff v1.2.0 v1.2.3 -- src/services/IcecastService.js | grep -A 30 "start()"
  ```
- [ ] Verify Icecast status detection improvements
  ```bash
  git diff v1.2.0 v1.2.3 -- src/services/IcecastService.js | grep -A 15 "isRunning\|checkStatus"
  ```

### Priority 4: Frontend (FFmpegStreamsManager.js)
**Focus:** Lines 1334-1360 (error display)

**Tasks:**
- [ ] Check error display logic changes
  ```bash
  git diff v1.2.0 v1.2.3 -- public/components/FFmpegStreamsManager.js | grep -A 30 "toast\|notification"
  ```
- [ ] Check timeout changes
  ```bash
  git diff v1.2.0 v1.2.3 -- public/components/FFmpegStreamsManager.js | grep "60.*seconds\|timeout"
  ```
- [ ] Verify error message formatting preserved
  ```bash
  git diff v1.2.0 v1.2.3 -- public/components/FFmpegStreamsManager.js | grep -A 10 "whitespace-pre-wrap\|max-w-3xl"
  ```

---

## 🎯 SPECIFIC HYPOTHESES TO TEST

### Hypothesis 1: Port Detection Regression
**Evidence:** Report shows port handling in connection errors (Line 251): `const port = context.icecastPort || context.port || 8000;`

**Tasks:**
- [ ] Check if port default changed
  ```bash
  git diff v1.2.0 v1.2.3 | grep -B 10 -A 10 "8000\|3001\|icecastPort"
  ```
- [ ] Check .env handling changes
  ```bash
  git diff v1.2.0 v1.2.3 -- src/config/
  ```
- [ ] Verify if `actualPort` determination changed in StreamingService line 312
- [ ] Test: Does v1.2.0 use different port detection than v1.2.3?

### Hypothesis 2: Windows Exit Code Mishandling
**Evidence:** Report notes only 5 Windows exit codes mapped, many missing.

**Tasks:**
- [ ] Check if exit code handling changed
  ```bash
  git diff v1.2.0 v1.2.3 -- src/utils/errorDiagnostics.js | grep -A 20 "exitCode"
  ```
- [ ] Check for new crash patterns
  ```bash
  git diff v1.2.0 v1.2.3 -- src/utils/errorDiagnostics.js | grep "0xA7F00008\|2812791304"
  ```
- [ ] Verify if v1.2.2 added exit code `0xA7F00008` (Windows crash)
- [ ] Test: Is new exit code overmatching legitimate errors?

### Hypothesis 3: Pattern Order Changed (HIGH PRIORITY)
**Evidence:** Report explicitly warns: "Pattern order matters - more specific patterns must come before general ones" (Line 43).

**Tasks:**
- [ ] Extract full pattern order from each version
  ```bash
  for version in v1.2.0 v1.2.2 v1.2.3; do
    echo "=== $version ===" >> analysis_output/pattern_order_comparison.txt
    git show $version:src/utils/errorDiagnostics.js | grep -n "{ category:" >> analysis_output/pattern_order_comparison.txt
  done
  ```
- [ ] Compare pattern order files
- [ ] **If pattern order changed, this is the smoking gun**
- [ ] Document which patterns moved and why

### Hypothesis 4: Dependency Version Mismatch
**Evidence:** Common culprit for regressions.

**Tasks:**
- [ ] Check for FFmpeg/Node version requirements changes
  ```bash
  git diff v1.2.0 v1.2.3 -- package.json | grep "engines\|ffmpeg\|node"
  ```
- [ ] Check for breaking dependency updates
  ```bash
  diff analysis_output/package_1.2.0.json analysis_output/package_1.2.3.json | grep -E "express|socket.io|winston"
  ```
- [ ] Verify no minor version bumps that introduced breaking changes
- [ ] Test: Does v1.2.0 work with v1.2.3 dependencies?

---

## 🛠️ IMMEDIATE ACTIONS FOR AI AGENTS

### Step 1: Create Analysis Script
- [ ] Create `analyze_versions.sh` script (see full script in analysis report)
- [ ] Make script executable: `chmod +x analyze_versions.sh`
- [ ] Run script: `bash analyze_versions.sh`
- [ ] Review all output in `analysis_output/` folder

### Step 2: Prioritized Investigation (5-10 min each)

**Order of Investigation:**

1. **Check `package.json` dependency changes** (5 min)
   - [ ] Look for `express`, `socket.io`, `winston`, `node` version bumps
   - [ ] Verify no breaking changes in minor versions
   - [ ] Document any version changes

2. **Check `errorDiagnostics.js` pattern order** (10 min)
   - [ ] Extract pattern order from each version
   - [ ] **If order changed, STOP HERE - this is your bug**
   - [ ] Document pattern order differences

3. **Check `StreamingService.js` lines 312, 355, 1083** (15 min)
   - [ ] Verify `actualPort` determination didn't change
   - [ ] Check if error context data changed
   - [ ] Verify stderr handling didn't add bugs
   - [ ] Document any changes to error handling

4. **Check `IcecastService.js` port detection** (10 min)
   - [ ] Verify `detectPort()` logic stable across versions
   - [ ] Check Icecast startup validation
   - [ ] Document port detection changes

5. **Check Windows exit code handling** (10 min)
   - [ ] Verify no new exit codes added that overmatch
   - [ ] Check if crash detection logic changed
   - [ ] Document exit code mapping changes

---

## 🚀 RECOMMENDED FIX STRATEGY

### Option A: Revert & Forward (RECOMMENDED)

**Tasks:**
- [ ] Create clean v1.2.0 baseline
  ```bash
  git checkout -b fix/revert-to-working v1.2.0
  ```
- [ ] Test v1.2.0 thoroughly to confirm it works
- [ ] Cherry-pick commits from v1.2.0..v1.2.2 one at a time
  ```bash
  git log v1.2.0..v1.2.2 --oneline
  # Cherry-pick each commit individually
  git cherry-pick <commit-hash>
  # Test after each cherry-pick
  ```
- [ ] When a commit breaks things, investigate that specific commit
- [ ] Fix the breaking commit or skip it
- [ ] Continue forward to v1.2.3

### Option B: Forward-Patch from v1.2.3

**Tasks:**
- [ ] Stay on v1.2.3
- [ ] Use analysis output to identify specific breaking changes
- [ ] Create targeted fixes for identified issues
- [ ] Test each fix incrementally
- [ ] Document fixes in commit messages

### Option C: Hybrid Approach

**Tasks:**
- [ ] Use analysis to identify likely breaking commits
- [ ] Revert only those specific commits
- [ ] Test if reverting fixes the issue
- [ ] If yes, re-apply commits with fixes
- [ ] If no, continue investigation

---

## 📊 ANALYSIS OUTPUT REVIEW

After running analysis scripts, review:

- [ ] `CHANGES_*_STAT.txt` - Which files changed most?
- [ ] `diff_StreamingService_*.patch` - What changed in core streaming logic?
- [ ] `diff_errorDiag_*.patch` - What changed in error detection?
- [ ] `pattern_order_comparison.txt` - **CRITICAL:** Did pattern order change?
- [ ] `deps_*.txt` - Did dependencies change?
- [ ] `commits_*.txt` - What commits were made between versions?
- [ ] `streaming_commits.txt` - Which commits touched streaming code?

---

## ✅ SUCCESS CRITERIA

**Analysis Complete When:**
- [ ] All diff files generated and reviewed
- [ ] Pattern order compared (if changed, root cause found)
- [ ] Dependency changes identified
- [ ] Breaking commits identified
- [ ] Fix strategy chosen and implemented
- [ ] v1.2.0 functionality restored
- [ ] Tests pass on fixed version

**Fix Complete When:**
- [ ] Streams start successfully
- [ ] Error diagnostics work correctly
- [ ] No regression from v1.2.0 functionality
- [ ] All tests pass
- [ ] Documentation updated

---

## 📝 NOTES

- **Pattern order is critical** - if this changed, it's likely the root cause
- **First-match-wins logic** means pattern order matters more than pattern count
- **Windows exit codes** need careful handling (signed/unsigned conversion)
- **Port detection** must be consistent across services
- **Context data** passed to diagnostics must match expected format

---

## 🔗 RELATED FILES

- `ERROR_DIAGNOSTICS_ANALYSIS_REPORT.md` - Full analysis report
- `src/utils/errorDiagnostics.js` - Error diagnostics system (715 lines)
- `src/services/StreamingService.js` - Primary integration point
- `src/services/IcecastService.js` - Icecast management
- `public/components/FFmpegStreamsManager.js` - Frontend error display

---

**Next Action:** Start with Phase 1 (Create Analysis Branch) and work through priorities sequentially.
