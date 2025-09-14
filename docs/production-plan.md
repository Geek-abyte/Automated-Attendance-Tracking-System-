# Automated Attendance Tracking System - MVP Development Plan

## Project Overview
Building a working prototype/MVP of an offline-first attendance tracking system using Bluetooth device identification. This MVP will demonstrate the core concept with minimal viable features to validate the approach before full production development.

## MVP Scope & Goals
- **Primary Goal**: Prove the offline-first Bluetooth scanning concept works
- **Core Features Only**: Basic event creation, user registration, BLE scanning, and batch sync
- **Simplified UI**: Functional but basic interfaces
- **Limited Scale**: Support 20-50 users per event for testing
- **Proof of Concept**: Validate technical feasibility before production investment

---

## Phase 1: MVP Backend

**Milestone: Backend Ready for Integration**

#### Step 1: Minimal Convex Setup
- [ ] Initialize Convex project with basic configuration
- [ ] Set up simple authentication (Clerk or basic auth)
- [ ] Deploy to development environment
- [ ] Create basic environment variables

#### Step 2: Essential Database Schema
- [ ] Implement minimal schema:
  - Users (name, email, bleUuid)
  - Events (name, startTime, endTime)  
  - Attendance (userId, eventId, timestamp)
- [ ] Skip complex relationships for MVP
- [ ] Test with sample data

#### Step 3: Basic CRUD Functions
- [ ] Simple user creation/lookup
- [ ] Basic event creation and listing
- [ ] Simple check-in function (no duplicate prevention yet)
- [ ] Basic attendance queries

**MVP Checkpoint 1:**
```bash
# Basic functionality tests
npm run test:mvp-backend
```

#### Step 4: Batch Check-in Endpoint
- [ ] Simple HTTP endpoint for batch uploads
- [ ] Basic API key authentication
- [ ] Simple JSON payload handling
- [ ] Basic error responses

#### Step 5: MVP Business Logic
- [ ] Simple duplicate check-in prevention
- [ ] Basic attendance reporting
- [ ] Simple event management
- [ ] Essential error handling only

**MVP Checkpoint 2:**
```bash
# API integration tests
curl -X POST localhost:3000/batchCheckin
```

**Phase 1 MVP Deliverables:**
- ✅ Working Convex backend with essential features
- ✅ Basic database schema
- ✅ Simple authentication
- ✅ Batch check-in API
- ✅ Basic testing

---

## Phase 2: MVP Admin Interface

**Milestone: Admin Dashboard Functional**

#### Step 1: Minimal Next.js Setup
- [ ] Basic Next.js project with TypeScript
- [ ] Simple authentication (no complex role management)
- [ ] Basic routing and navigation
- [ ] Connect to Convex backend

#### Step 2: Essential Admin Features
- [ ] Simple event creation form
- [ ] Basic event list view
- [ ] Simple user management (view only)
- [ ] Basic attendance report (simple table)

#### Step 3: Scanner Sync Interface
- [ ] Simple "sync" button interface
- [ ] Basic sync status display
- [ ] Simple attendance data view after sync
- [ ] No complex UI/UX - just functional

**MVP Checkpoint 3:**
```bash
# Basic admin functionality test
npm run test:admin-mvp
```

**Phase 2 MVP Deliverables:**
- ✅ Basic admin web interface
- ✅ Event creation and management
- ✅ Simple attendance reporting
- ✅ Scanner sync interface

---

## Phase 3: MVP Mobile App

**Milestone: Mobile App with BLE Broadcasting**

#### Step 1: React Native Basics
- [ ] Basic React Native project setup
- [ ] Simple navigation
- [ ] Basic authentication
- [ ] Connect to Convex backend

#### Step 2: Core Mobile Features
- [ ] User registration/login
- [ ] Simple event list and registration
- [ ] User profile with bleUuid display
- [ ] Basic UI (no design polish)

#### Step 3: BLE Broadcasting
- [ ] Implement simple BLE UUID broadcasting
- [ ] Basic background service (Android priority)
- [ ] Handle basic permissions
- [ ] Test on physical device

**MVP Checkpoint 4:**
```bash
# Mobile app basic functionality
npm run test:mobile-mvp
```

**Phase 3 MVP Deliverables:**
- ✅ Basic React Native app
- ✅ User registration and event sign-up
- ✅ BLE UUID broadcasting
- ✅ Works on at least Android

---

## Phase 4: MVP Scanner

**Milestone: Complete BLE Scanner with Sync**

#### Step 1: Scanner Foundation
- [ ] Simple Python project setup
- [ ] Install essential libraries (bleak, requests)
- [ ] Basic BLE device discovery
- [ ] Simple UUID filtering
- [ ] Test with mobile app

#### Step 2: Local Storage
- [ ] Simple JSONL file writing
- [ ] Basic duplicate detection (in-memory set)
- [ ] Simple logging
- [ ] Basic error handling

**MVP Checkpoint 5:**
```bash
# Scanner can detect mobile apps
python scanner.py --scan
```

#### Step 3: HTTP Sync
- [ ] Simple HTTP client for batch upload
- [ ] Basic API authentication  
- [ ] Simple retry logic
- [ ] Basic sync command

#### Step 4: MVP Polish
- [ ] Simple command-line interface
- [ ] Basic configuration file
- [ ] Simple setup instructions
- [ ] Basic troubleshooting

**MVP Checkpoint 6:**
```bash
# Complete end-to-end test
python scanner.py --sync
```

**Phase 4 MVP Deliverables:**
- ✅ Working Python scanner
- ✅ BLE device detection
- ✅ Local data storage
- ✅ Batch sync to backend

---

## Phase 5: MVP Integration & Testing

**Milestone: Complete MVP System**

#### Step 1: System Integration Testing
- [ ] Complete workflow test (create event → register users → scan → sync → view report)
- [ ] Test with multiple mobile devices
- [ ] Verify offline functionality
- [ ] Test sync reliability

#### Step 2: Basic Bug Fixes
- [ ] Fix critical integration issues
- [ ] Resolve major UX problems
- [ ] Ensure core functionality works reliably
- [ ] Basic performance optimization

#### Step 3: MVP Polish
- [ ] Fix remaining critical bugs
- [ ] Basic documentation
- [ ] Simple setup guides
- [ ] Demo preparation

#### Step 4: MVP Testing & Validation
- [ ] Test with 10-20 users
- [ ] Validate core assumptions
- [ ] Document lessons learned
- [ ] Prepare feedback collection

**Phase 5 MVP Deliverables:**
- ✅ Fully integrated MVP system
- ✅ End-to-end functionality validated
- ✅ Core concept proven
- ✅ Ready for stakeholder demo

---

## MVP Testing Strategy

### Essential Testing Only
- **Backend**: Basic API tests with Postman
- **Admin App**: Manual testing of core features
- **Mobile App**: Physical device testing (Android priority)
- **Scanner**: Manual testing with real mobile devices
- **Integration**: Complete workflow testing

### MVP Success Criteria
1. **Core Workflow Works**: Create event → register users → scan attendance → sync data → view report
2. **Offline Functionality**: Scanner works without internet during scanning
3. **BLE Detection**: Scanner reliably detects mobile devices within 3-5 meters
4. **Data Integrity**: No data loss during offline storage and sync
5. **Basic Performance**: Handles 20-50 users per event

---

## MVP Limitations (Intentional)
- **No advanced security**: Basic authentication only
- **Minimal UI/UX**: Functional but not polished
- **Limited scalability**: Not optimized for large events
- **Basic error handling**: Essential error handling only
- **Single scanner**: No multi-scanner support
- **No analytics**: Basic attendance reports only
- **Platform priority**: Android over iOS initially

---

## Risk Mitigation (MVP Focus)

### Critical MVP Risks
1. **BLE Reliability**: Early testing with multiple phone models
2. **Battery Drain**: Basic optimization and user warnings
3. **Technical Feasibility**: Rapid prototyping to validate approach

### Development Risks  
1. **BLE Integration**: Start with simple implementation, iterate
2. **Cross-platform Issues**: Focus on Android first, iOS later
3. **Scope Creep**: Strict feature freeze after Phase 1

---

## Post-MVP Next Steps

### Immediate: MVP Validation
- [ ] Demo to stakeholders
- [ ] Collect user feedback
- [ ] Document lessons learned
- [ ] Assess technical feasibility

### Short-term: MVP Enhancement
- [ ] Polish critical UX issues
- [ ] Add basic security improvements
- [ ] iOS compatibility
- [ ] Performance optimization

### Long-term: Production Planning
- [ ] Full production architecture design
- [ ] Enterprise features planning
- [ ] Scalability and security roadmap
- [ ] Commercial viability assessment

This MVP approach allows you to validate the core concept quickly and cheaply before investing in a full production system.
