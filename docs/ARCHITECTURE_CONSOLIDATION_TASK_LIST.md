# Architecture Documentation Consolidation - Task List

**Goal:** Create ONE comprehensive architecture document covering all 7 services and end-to-end system flows, replacing the two redundant Icecast-focused documents.

**Current State:**
- ❌ `ICECAST_CONFIGURATION_AND_RUNTIME_ARCHITECTURE.md` (6,542 words) - Detailed but only covers Icecast (~20% of system)
- ❌ `ICECAST_CONFIG_ARCHITECTURE.md` (524 words) - Redundant summary of above
- ❌ Missing: FFmpeg, AudioDevice, WebSocket, System, Update services
- ❌ Missing: End-to-end stream creation flow
- ❌ Missing: Error diagnostics flow
- ❌ Missing: Troubleshooting decision trees

**Target State:**
- ✅ `LANSTREAMER_SYSTEM_ARCHITECTURE.md` - Single comprehensive document
- ✅ Covers all 7 services with detailed flows
- ✅ Includes troubleshooting decision trees
- ✅ Includes file reference tables

---

## Phase 1: Analysis & Planning

### Task 1.1: Analyze All Service Files
**Status:** ⏳ Pending  
**Estimated Time:** 30 minutes  
**Files to Read:**
- [ ] `src/services/IcecastService.js` (2,911 lines) - Already analyzed
- [ ] `src/services/FFmpegService.js` (249 lines) - Analyze process spawning, argument building
- [ ] `src/services/StreamingService.js` (1,270 lines) - Analyze orchestration logic
- [ ] `src/services/AudioDeviceService.js` (600 lines) - Analyze device enumeration
- [ ] `src/services/WebSocketService.js` (417 lines) - Analyze real-time updates
- [ ] `src/services/SystemService.js` (435 lines) - Analyze health checks
- [ ] `src/services/UpdateService.js` (203 lines) - Analyze update mechanism

**Deliverable:** Notes on each service's:
- Main responsibilities
- Key methods and their purposes
- Dependencies on other services
- Initialization sequence
- Error handling patterns

---

### Task 1.2: Analyze Supporting Files
**Status:** ⏳ Pending  
**Estimated Time:** 20 minutes  
**Files to Read:**
- [ ] `src/utils/errorDiagnostics.js` (736 lines) - Error pattern matching system
- [ ] `src/routes/streams.js` - Stream API endpoints
- [ ] `src/routes/system.js` - System API endpoints
- [ ] `public/components/FFmpegStreamsManager.js` - Frontend stream management
- [ ] `src/server.js` - Entry point and module loading order

**Deliverable:** Understanding of:
- Error flow: FFmpeg stderr → errorDiagnostics → Frontend
- API request flow: HTTP → Route → Service → Response
- Frontend-backend communication patterns

---

### Task 1.3: Map Service Dependencies
**Status:** ⏳ Pending  
**Estimated Time:** 15 minutes  
**Action:** Create dependency graph showing:
- Which services depend on which others
- Import order during module loading
- Initialization dependencies

**Deliverable:** Dependency graph diagram (text or ASCII art)

---

## Phase 2: Document Structure Design

### Task 2.1: Create Document Outline
**Status:** ⏳ Pending  
**Estimated Time:** 20 minutes  
**Action:** Design comprehensive table of contents with:
- Section hierarchy
- Cross-references between sections
- Decision on single doc vs. multiple docs

**Deliverable:** Complete TOC structure for `LANSTREAMER_SYSTEM_ARCHITECTURE.md`

**Proposed Structure:**
```markdown
# LANStreamer System Architecture

## Table of Contents
1. System Overview
   1.1 Three-Component Architecture
   1.2 Component Responsibilities
   1.3 Data Flow Diagrams
   1.4 Request Lifecycle Examples
2. Startup Sequence
   2.1 Module Loading Order
   2.2 Service Initialization Timeline
   2.3 Configuration Loading
3. Core Services
   3.1 IcecastService (move existing content)
   3.2 FFmpegService
   3.3 StreamingService
   3.4 AudioDeviceService
   3.5 WebSocketService
   3.6 SystemService
   3.7 UpdateService
4. Configuration Management
   4.1 Single Source of Truth (icecast.xml)
   4.2 Caching Strategy
   4.3 File Watching & Auto-Reload
5. Stream Creation Flow (End-to-End)
   5.1 User Action → API Request
   5.2 Service Orchestration
   5.3 FFmpeg Process Spawning
   5.4 Icecast Mount Point Creation
   5.5 Frontend Notification
6. Error Handling & Diagnostics
   6.1 Error Flow: FFmpeg → Diagnostics → Frontend
   6.2 Pattern Matching System
   6.3 Common Error Scenarios
7. Troubleshooting Decision Trees
   7.1 "Stream Won't Start" Flowchart
   7.2 "No Audio in Browser" Flowchart
   7.3 "Connection Refused" Flowchart
   7.4 "Device Not Found" Flowchart
8. File Reference
   8.1 Quick Lookup: Which File Does What?
   8.2 Configuration Files
   8.3 Service Files
   8.4 Route Files
```

---

### Task 2.2: Design Diagrams
**Status:** ⏳ Pending  
**Estimated Time:** 30 minutes  
**Action:** Plan ASCII/text diagrams for:
- System architecture (3 components)
- Request flow (start stream)
- Error flow (FFmpeg error → frontend)
- Service dependency graph
- Stream lifecycle state machine

**Deliverable:** Diagram specifications (text descriptions or ASCII mockups)

---

## Phase 3: Content Creation

### Task 3.1: Write System Overview Section
**Status:** ⏳ Pending  
**Estimated Time:** 45 minutes  
**Content:**
- [ ] Three-component architecture explanation
- [ ] Component responsibilities table
- [ ] Data flow diagram (FFmpeg → Icecast → Browser)
- [ ] Request lifecycle examples (start stream, handle error)

**Deliverable:** Section 1 complete (~500-800 words)

---

### Task 3.2: Expand Startup Sequence Section
**Status:** ⏳ Pending  
**Estimated Time:** 30 minutes  
**Action:** Enhance existing startup content from `ICECAST_CONFIGURATION_AND_RUNTIME_ARCHITECTURE.md`:
- [ ] Add all 7 services to initialization timeline
- [ ] Document service initialization order
- [ ] Add timing estimates for each phase
- [ ] Document what happens if services fail to initialize

**Deliverable:** Enhanced Section 2 with all services

---

### Task 3.3: Write FFmpegService Section
**Status:** ⏳ Pending  
**Estimated Time:** 60 minutes  
**Content:**
- [ ] Service responsibilities
- [ ] Process spawning mechanism
- [ ] Argument building (how FFmpeg commands are constructed)
- [ ] Error handling (stderr parsing)
- [ ] Process lifecycle (start, monitor, stop)
- [ ] Integration with StreamingService

**Deliverable:** Section 3.2 complete (~800-1200 words)

---

### Task 3.4: Write StreamingService Section
**Status:** ⏳ Pending  
**Estimated Time:** 60 minutes  
**Content:**
- [ ] Service responsibilities (orchestration)
- [ ] Stream lifecycle (create → start → monitor → stop)
- [ ] Integration with FFmpegService and IcecastService
- [ ] Persistent stream loading (`config/streams.json`)
- [ ] Stream cleanup logic
- [ ] Error propagation to frontend

**Deliverable:** Section 3.3 complete (~800-1200 words)

---

### Task 3.5: Write AudioDeviceService Section
**Status:** ⏳ Pending  
**Estimated Time:** 45 minutes  
**Content:**
- [ ] Service responsibilities
- [ ] Platform-specific device enumeration (Windows DirectShow, Linux ALSA)
- [ ] Device detection flow
- [ ] Device configuration storage
- [ ] Integration with FFmpeg (device name mapping)

**Deliverable:** Section 3.4 complete (~600-900 words)

---

### Task 3.6: Write WebSocketService Section
**Status:** ⏳ Pending  
**Estimated Time:** 40 minutes  
**Content:**
- [ ] Service responsibilities (real-time updates)
- [ ] WebSocket connection handling
- [ ] Event emission (stream-started, stream-stopped, stream-error)
- [ ] Room/room management
- [ ] Integration with frontend components

**Deliverable:** Section 3.5 complete (~500-800 words)

---

### Task 3.7: Write SystemService Section
**Status:** ⏳ Pending  
**Estimated Time:** 30 minutes  
**Content:**
- [ ] Service responsibilities (health checks, diagnostics)
- [ ] System info collection (CPU, memory, network)
- [ ] Setup wizard integration
- [ ] Port availability checks
- [ ] Dependency validation

**Deliverable:** Section 3.6 complete (~400-600 words)

---

### Task 3.8: Write UpdateService Section
**Status:** ⏳ Pending  
**Estimated Time:** 30 minutes  
**Content:**
- [ ] Service responsibilities (auto-update)
- [ ] Update check mechanism
- [ ] Version comparison
- [ ] Update notification flow

**Deliverable:** Section 3.7 complete (~300-500 words)

---

### Task 3.9: Migrate IcecastService Content
**Status:** ⏳ Pending  
**Estimated Time:** 30 minutes  
**Action:** Move and adapt existing detailed Icecast content:
- [ ] Extract relevant sections from `ICECAST_CONFIGURATION_AND_RUNTIME_ARCHITECTURE.md`
- [ ] Adapt to fit new document structure
- [ ] Ensure consistency with other service sections
- [ ] Add cross-references to other sections

**Deliverable:** Section 3.1 complete (adapted from existing content)

---

### Task 3.10: Write Configuration Management Section
**Status:** ⏳ Pending  
**Estimated Time:** 30 minutes  
**Action:** Consolidate config management content:
- [ ] Single source of truth explanation (icecast.xml)
- [ ] Caching strategy (device-config.json, in-memory)
- [ ] File watching mechanism (from existing doc)
- [ ] Configuration file locations table

**Deliverable:** Section 4 complete (~400-600 words)

---

### Task 3.11: Write End-to-End Stream Creation Flow
**Status:** ⏳ Pending  
**Estimated Time:** 60 minutes  
**Content:**
- [ ] Step-by-step trace: User clicks "Start Stream" → Stream playing in browser
- [ ] API request flow (`POST /api/streams/start`)
- [ ] Service orchestration (StreamingService → FFmpegService → IcecastService)
- [ ] FFmpeg process spawning
- [ ] Icecast mount point creation
- [ ] WebSocket notification to frontend
- [ ] Browser playback initiation

**Deliverable:** Section 5 complete with detailed trace (~1000-1500 words)

---

### Task 3.12: Write Error Handling & Diagnostics Section
**Status:** ⏳ Pending  
**Estimated Time:** 60 minutes  
**Content:**
- [ ] Error flow: FFmpeg stderr → errorDiagnostics → Frontend
- [ ] Pattern matching system (how errorDiagnostics.js works)
- [ ] Common error scenarios with solutions:
  - Connection refused (Icecast not running)
  - Device not found
  - Codec errors
  - Port conflicts
- [ ] Error message generation (user-friendly vs. technical)

**Deliverable:** Section 6 complete (~800-1200 words)

---

### Task 3.13: Write Troubleshooting Decision Trees
**Status:** ⏳ Pending  
**Estimated Time:** 90 minutes  
**Content:** Create flowcharts (ASCII/text) for:
- [ ] "Stream Won't Start" - Decision tree
- [ ] "No Audio in Browser" - Decision tree
- [ ] "Connection Refused" - Decision tree
- [ ] "Device Not Found" - Decision tree
- [ ] "FFmpeg Process Dies Immediately" - Decision tree

**Format:** Text-based flowcharts with:
```
Problem: Stream won't start
│
├─> Is Icecast running?
│   ├─> No → Start Icecast → Retry
│   └─> Yes → Continue
│
├─> Is device available?
│   ├─> No → Check device connection → Retry
│   └─> Yes → Continue
│
└─> Check FFmpeg logs → Diagnose specific error
```

**Deliverable:** Section 7 complete with 5+ decision trees (~1000-1500 words)

---

### Task 3.14: Write File Reference Section
**Status:** ⏳ Pending  
**Estimated Time:** 30 minutes  
**Content:** Quick lookup tables:
- [ ] Configuration files (what each does, where located)
- [ ] Service files (main responsibilities, key methods)
- [ ] Route files (endpoints, handlers)
- [ ] Utility files (errorDiagnostics, logger, etc.)

**Deliverable:** Section 8 complete (~400-600 words)

---

## Phase 4: Integration & Polish

### Task 4.1: Merge All Sections
**Status:** ⏳ Pending  
**Estimated Time:** 30 minutes  
**Action:**
- [ ] Combine all sections into single document
- [ ] Ensure consistent formatting
- [ ] Add cross-references between sections
- [ ] Verify all internal links work

**Deliverable:** Complete `LANSTREAMER_SYSTEM_ARCHITECTURE.md` draft

---

### Task 4.2: Add Metadata & Front Matter
**Status:** ⏳ Pending  
**Estimated Time:** 10 minutes  
**Content:**
- [ ] Document version/date
- [ ] Based on codebase version (v1.2.3)
- [ ] Branch reference
- [ ] Author/contributor notes

**Deliverable:** Document header complete

---

### Task 4.3: Review & Edit
**Status:** ⏳ Pending  
**Estimated Time:** 60 minutes  
**Action:**
- [ ] Read entire document for consistency
- [ ] Check all file paths are correct
- [ ] Verify all line numbers are accurate
- [ ] Ensure all code examples are correct
- [ ] Check spelling/grammar
- [ ] Verify all diagrams render correctly

**Deliverable:** Polished document ready for review

---

## Phase 5: Cleanup & Migration

### Task 5.1: Backup Old Documents
**Status:** ⏳ Pending  
**Estimated Time:** 5 minutes  
**Action:**
- [ ] Create backup copies of old documents (optional, for reference)
- [ ] Or move to `docs/archive/` folder

**Deliverable:** Old docs backed up or archived

---

### Task 5.2: Delete Redundant Documents
**Status:** ⏳ Pending  
**Estimated Time:** 5 minutes  
**Action:**
- [ ] Delete `docs/ICECAST_CONFIG_ARCHITECTURE.md` (redundant summary)
- [ ] Delete `docs/ICECAST_CONFIGURATION_AND_RUNTIME_ARCHITECTURE.md` (content migrated)

**Deliverable:** Redundant files removed

---

### Task 5.3: Update References
**Status:** ⏳ Pending  
**Estimated Time:** 15 minutes  
**Action:** Search codebase for references to old doc names:
- [ ] Update `README.md` if it references old docs
- [ ] Update `CLAUDE.md` if it references old docs
- [ ] Update any other documentation that links to old files

**Deliverable:** All references updated

---

### Task 5.4: Commit & Push
**Status:** ⏳ Pending  
**Estimated Time:** 5 minutes  
**Action:**
- [ ] `git add docs/LANSTREAMER_SYSTEM_ARCHITECTURE.md`
- [ ] `git rm docs/ICECAST_CONFIG_ARCHITECTURE.md`
- [ ] `git rm docs/ICECAST_CONFIGURATION_AND_RUNTIME_ARCHITECTURE.md`
- [ ] `git commit -m "docs: Consolidate architecture documentation into comprehensive system architecture"`
- [ ] `git push origin [branch]`

**Deliverable:** Changes committed and pushed

---

## Phase 6: Validation

### Task 6.1: Technical Review
**Status:** ⏳ Pending  
**Estimated Time:** 30 minutes  
**Action:**
- [ ] Verify all file paths exist
- [ ] Verify all line numbers are correct (check against actual files)
- [ ] Verify all function names are correct
- [ ] Test all code examples (if any)

**Deliverable:** Technical accuracy verified

---

### Task 6.2: Completeness Check
**Status:** ⏳ Pending  
**Estimated Time:** 20 minutes  
**Action:** Verify all services are documented:
- [ ] ✅ IcecastService
- [ ] ✅ FFmpegService
- [ ] ✅ StreamingService
- [ ] ✅ AudioDeviceService
- [ ] ✅ WebSocketService
- [ ] ✅ SystemService
- [ ] ✅ UpdateService

**Deliverable:** Completeness checklist verified

---

## Summary

**Total Estimated Time:** ~15-20 hours  
**Total Tasks:** 28 tasks across 6 phases  
**Deliverable:** Single comprehensive architecture document (~8,000-12,000 words)

**Priority Order:**
1. **Phase 1** (Analysis) - Must complete first
2. **Phase 2** (Structure) - Must complete before Phase 3
3. **Phase 3** (Content) - Can work on sections in parallel after structure is set
4. **Phase 4** (Integration) - After all content is written
5. **Phase 5** (Cleanup) - After document is complete
6. **Phase 6** (Validation) - Final step before considering complete

---

## Notes

- **Reuse existing content:** The IcecastService section can be largely adapted from `ICECAST_CONFIGURATION_AND_RUNTIME_ARCHITECTURE.md`
- **Maintain detail level:** Keep the same level of detail (file names, line numbers, function names) for all services
- **Consistency:** Use consistent formatting, terminology, and structure across all service sections
- **Practical focus:** Include troubleshooting decision trees - these are highly valuable for users

---

**Last Updated:** 2026-01-27  
**Status:** Planning Phase - Ready to Begin Implementation
