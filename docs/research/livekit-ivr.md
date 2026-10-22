# Research Findings: LiveKit Agents SDK Telephony and IVR Capabilities

This document provides technical research on the LiveKit Agents SDK and LiveKit Telephony stack for project Milo. Milo is a personal voice agent designed to navigate automated company support lines, interact with interactive voice response (IVR) systems, wait on hold, and interface with human support representatives.

---

## 1. Telephony Capabilities

LiveKit Telephony connects traditional Public Switched Telephone Networks (PSTN) and SIP trunks with LiveKit WebRTC rooms. In this architecture, telephone calls join LiveKit rooms as SIP participants, enabling AI agents powered by the LiveKit Agents SDK to interact with callers using real-time audio pipelines.

### Core Architecture and Protocols
* **SIP Transport Protocols**: Supports SIP over UDP, TCP, and TLS.
* **Media Protocols**: RTP/SRTP carrying G.711 (PCMU/PCMA) and Opus audio codecs.
* **DTMF Signaling**: Transmitted over RTP using the RFC 4733 / RFC 2833 `telephone-event/8000` payload format, sending event codes, durations, and volumes rather than in-band audio tones.
* **Call Transfer**: Cold transfers via SIP REFER and warm transfers using agent-assisted consultation workflows.

### Primary APIs and Class References
* **`CreateSIPParticipant`**: Server API to initiate outbound calls or place SIP targets into rooms.
  * Link: [SIP APIs Documentation](https://docs.livekit.io/reference/telephony/sip-api/)
* **`TransferSIPParticipant`**: Server API to initiate cold call forwarding via SIP REFER.
  * Link: [SIP APIs Documentation](https://docs.livekit.io/reference/telephony/sip-api/)
* **`publishDtmf` / `publish_dtmf`**: Participant API to transmit DTMF keypad tones to telephony endpoints.
  * Link: [Handling DTMF Documentation](https://docs.livekit.io/telephony/features/dtmf/)
* **`voice.AMD` / `AMD`**: Agent framework module for classifying outbound call responses (human, voicemail, IVR, unavailable).
  * Link: [Answering Machine Detection Documentation](https://docs.livekit.io/telephony/features/answering-machine-detection/)
* **`WarmTransferTask`**: Prebuilt workflow task to handle agent-assisted transfers with hold music and consultation context.
  * Link: [Agent-assisted Warm Transfer Documentation](https://docs.livekit.io/telephony/features/transfers/warm/)

---

## 2. How to Dial Out

Outbound calling in LiveKit requires creating a SIP participant in a LiveKit room. LiveKit then connects to an outbound SIP trunk and places a call to the specified telephone number.

### Outbound Calling Architecture
1. **Room and Agent Setup**: An agent session or background worker creates or joins a LiveKit room.
2. **`CreateSIPParticipant` Invocation**: The application invokes the `CreateSIPParticipant` API, passing target details and trunk credentials.
3. **SIP INVITE**: LiveKit SIP service issues a SIP INVITE to the configured provider (for example, Twilio, Telnyx, or Plivo).
4. **Call Connection**: Upon receiving SIP 200 OK, the callee is added to the room as a SIP participant, and media streaming begins.

### SIP Trunk Configuration Options
Outbound calls can use either stored trunks or inline trunk configurations:
* **Stored Outbound Trunk**: Created ahead of time in LiveKit Cloud or via CLI (`CreateSIPOutboundTrunk`) and referenced by `sip_trunk_id`.
* **Inline Trunk Configuration**: Passed directly in the `CreateSIPParticipant` request using `SIPOutboundConfig` with `hostname`, `auth_username`, and `auth_password`. This is useful for multi-tenant setups.

### LiveKit Phone Numbers vs Third-Party SIP Providers
* **LiveKit Phone Numbers**: Allows purchasing US local and toll-free numbers directly through LiveKit Cloud without third-party SIP configuration. However, LiveKit Phone Numbers currently supports **inbound calling only** (outbound support is planned).
* **Third-Party Providers**: Outbound calling requires integration with third-party SIP trunking providers such as Twilio, Telnyx, or Plivo.

### Pricing and Quotas
* **LiveKit Cloud**: Includes 1 free US local phone number per plan. Build plans include 50 free inbound minutes. Additional numbers and usage are billed per second plus a fixed monthly fee per number.
* **Telephony Rates**: Outbound calling incurs per-minute voice costs from the underlying SIP trunking provider (Twilio, Telnyx, etc.) plus LiveKit Cloud real-time media traffic charges.

### Outbound Code Examples

#### Python Code Snippet
Source: [Make Outbound Calls Documentation](https://docs.livekit.io/telephony/making-calls/outbound-calls/)
```python
import os
from livekit import api
from livekit.protocol.sip import SIPOutboundConfig

async def make_outbound_call(livekit_api: api.LiveKitAPI, room_name: str, phone_number: str):
    participant = await livekit_api.sip.create_sip_participant(
        api.CreateSIPParticipantRequest(
            trunk=SIPOutboundConfig(
                hostname=os.getenv("SIP_TRUNK_HOSTNAME"),
                auth_username=os.getenv("SIP_AUTH_USERNAME"),
                auth_password=os.getenv("SIP_AUTH_PASSWORD"),
            ),
            sip_call_to=phone_number,
            room_name=room_name,
            participant_identity="outbound-caller",
            wait_until_answered=True,
        )
    )
    return participant
```

#### TypeScript Code Snippet
Source: [Answering Machine Detection Documentation](https://docs.livekit.io/telephony/features/answering-machine-detection/)
```typescript
import { LiveKitAPI } from 'livekit-server-sdk';
import { SIPOutboundConfig } from '@livekit/protocol';

async function makeOutboundCall(phoneNumber: string, roomName: string) {
  const api = new LiveKitAPI();
  await api.sip.createSipParticipant(
    '', // Empty string when using inline trunk config
    phoneNumber,
    roomName,
    {
      participantIdentity: 'outbound-caller',
      waitUntilAnswered: true,
    },
    new SIPOutboundConfig({
      hostname: process.env.SIP_TRUNK_HOSTNAME!,
      authUsername: process.env.SIP_AUTH_USERNAME!,
      authPassword: process.env.SIP_AUTH_PASSWORD!,
    })
  );
}
```

---

## 3. DTMF + IVR Navigation

Dual-Tone Multi-Frequency (DTMF) signaling allows an agent to press keypad options during a phone call to navigate automated menus.

### Sending DTMF Tones Mid-Call
Agents send DTMF tones using the `publishDtmf` API on the room's local participant.

* **API Signature (Python)**: `await local_participant.publish_dtmf(code=code_int, digit=digit_str)`
* **API Signature (TypeScript)**: `await localParticipant.publishDtmf(code, digit)`
* **Parameters**:
  * `code` (integer): Numeric event code per RFC 4733 (0-9 for digits 0-9, 10 for `*`, 11 for `#`).
  * `digit` (string): Character representation (e.g. `'1'`, `'#'`, `'*'`).

#### DTMF Code Example (Python)
Source: [Handling DTMF Documentation](https://docs.livekit.io/telephony/features/dtmf/)
```python
# Publishes 123# in DTMF over RTP
await local_participant.publish_dtmf(code=1, digit='1')
await local_participant.publish_dtmf(code=2, digit='2')
await local_participant.publish_dtmf(code=3, digit='3')
await local_participant.publish_dtmf(code=11, digit='#')
```

#### DTMF Code Example (TypeScript)
Source: [Handling DTMF Documentation](https://docs.livekit.io/telephony/features/dtmf/)
```typescript
// Publishes 123# in DTMF over RTP
await localParticipant.publishDtmf(1, '1');
await localParticipant.publishDtmf(2, '2');
await localParticipant.publishDtmf(3, '3');
await localParticipant.publishDtmf(11, '#');
```

### Initial Connection Extension Codes
When placing an outbound call, DTMF extension codes can be passed directly in `CreateSIPParticipantRequest.dtmf`.
* Example: `"dtmf": "*123#ww456"`
* Delays: Character `'w'` introduces a 0.5-second pause before proceeding.

### Receiving DTMF Tones
When telephone users press keypad numbers, LiveKit relays the DTMF signals as events:
* **Python**: `@room.on("sip_dtmf_received")`
* **TypeScript**: `room.on(RoomEvent.DtmfReceived, (code, digit, participant) => ...)`

### Prebuilt Agent Tools
* **`send_dtmf_events`**: A prebuilt agent tool in Python that allows LLMs to send DTMF sequences dynamically.
* **`GetDtmfTask`**: Prebuilt task for collecting spoken or keypad-entered digits from callers.

---

## 4. Hold + Human Detection

When navigating corporate phone systems, Milo must distinguish between human agents, automated IVRs, and hold music, as well as handle wait periods gracefully.

### Answering Machine Detection (AMD)
LiveKit provides an `AMD` module that evaluates the beginning of an outbound call during the first utterance.

#### How AMD Works
1. Pauses agent speech output while listening to the initial call greeting.
2. Runs two detection paths in parallel: a fast-path audio heuristic for short greetings followed by silence, and an LLM classifier evaluating transcript context.
3. Returns one of five classification categories:
   * `human`: A real person answered. Proceed with normal conversation.
   * `machine-ivr`: An IVR or automated menu answered.
   * `machine-vm`: Voicemail greeting detected.
   * `machine-unavailable`: Mailbox full or unreachable.
   * `uncertain`: Unclear greeting or silence.

#### AMD Code Example (Python)
Source: [Answering Machine Detection Documentation](https://docs.livekit.io/telephony/features/answering-machine-detection/)
```python
from livekit.agents import AMD

async with AMD(session, participant_identity=participant_identity) as detector:
    await ctx.api.sip.create_sip_participant(...)
    await ctx.wait_for_participant(identity=participant_identity)
    result = await detector.execute()

    if result.category in ("human", "uncertain"):
        logger.info("Human detected, starting conversation")
    elif result.category == "machine-ivr":
        logger.info("IVR detected, beginning menu navigation")
```

### Silence Detection and Voice Pipeline
* **Voice Activity Detection (VAD)**: Uses Silero VAD (`livekit-plugins-silero`) or LiveKit Inference model-based turn detection to detect active speech vs silence.
* **Pipeline Configuration**: `AgentSession` manages VAD, STT, LLM, and TTS orchestration. Parameters such as `min_speaking_duration` and `silence_duration` control when the agent determines that a speaker has finished talking.

### Placing Callers on Hold
To place a caller on hold or pause interaction during hold music:
```python
# Mute input and output audio streams for the caller session
customer_session.input.set_audio_enabled(False)
customer_session.output.set_audio_enabled(False)
```

---

## 5. Transfers

LiveKit supports two primary mechanisms for call transfers: cold transfers (call forwarding) and warm transfers (agent-assisted transfers).

### Cold Transfers (SIP REFER)
Cold transfers forward the caller directly to another phone number or SIP endpoint, ending the caller's LiveKit room session.

* **API**: `TransferSIPParticipant` (Server API)
* **Behavior**: LiveKit sends a SIP REFER request to the trunk provider.
* **Timeout Control**: The `ringing_timeout` parameter (default 30 seconds) caps how long LiveKit waits for the transfer destination to answer.

#### Cold Transfer Code Example (Python)
Source: [Call Forwarding Documentation](https://docs.livekit.io/telephony/features/transfers/cold/)
```python
from livekit import api

async with api.LiveKitAPI() as livekit_api:
    await livekit_api.sip.transfer_sip_participant(
        api.TransferSIPParticipantRequest(
            participant_identity=participant_identity,
            room_name=room_name,
            transfer_to="tel:+14155550100",
            play_dialtone=False,
            ringing_timeout=30.0,
        )
    )
```

### Warm Transfers (Agent-Assisted)
Warm transfers keep the caller on hold in a main room while an agent dials a manager or target endpoint in a separate consultation room, provides context, and then bridges the calls.

* **Prebuilt Workflow**: `WarmTransferTask` (available in Python `livekit.agents.beta.workflows` and Node.js `@livekit/agents`).
* **Process**:
  1. Caller is placed on hold with optional hold music.
  2. A consultation room is created, and the manager is dialed via SIP.
  3. The agent summarizes call history to the manager.
  4. The manager is moved into the caller's room.
  5. The agent exits, leaving the caller and manager connected.

#### Warm Transfer Code Example (Python)
Source: [Agent-assisted Warm Transfer Documentation](https://docs.livekit.io/telephony/features/transfers/warm/)
```python
import os
from livekit.agents.beta.workflows import WarmTransferTask
from livekit.protocol.sip import SIPOutboundConfig

result = await WarmTransferTask(
    sip_call_to="+15105550123",
    sip_connection=SIPOutboundConfig(
        hostname=os.getenv("SIP_TRUNK_HOSTNAME"),
        auth_username=os.getenv("SIP_AUTH_USERNAME"),
        auth_password=os.getenv("SIP_AUTH_PASSWORD"),
    ),
    chat_ctx=self.chat_ctx,
    dtmf="wwww1234#",
    ringing_timeout=30.0,
)
```

---

## 6. Gaps for Milo

While LiveKit provides robust telephony primitives, building a fully autonomous agent like Milo requires implementing several specialized components on top of the LiveKit Agents SDK.

### 1. Mid-Call Hold Music and Human Answer Detection
* **SDK Limitation**: LiveKit's AMD runs only once at the beginning of the call on the first utterance.
* **Milo Requirement**: Support lines often place the caller on hold after menu navigation. Milo needs a continuous, mid-call monitoring loop that classifies background hold music vs silence vs a human customer service representative saying "Hello, thank you for waiting."

### 2. Multi-Step IVR Decision and Execution Engine
* **SDK Limitation**: LiveKit provides the `publishDtmf` tool and basic IVR detection, but does not provide an autonomous multi-level menu planner.
* **Milo Requirement**: Milo needs a state machine coupled with LLM logic to parse complex IVR audio prompts ("For billing press 1, for technical support press 2"), map the user's ultimate goal to the correct menu path, execute keypad presses, and handle multi-tier menu hierarchies.

### 3. Prompt Synchronization and End-of-Prompt Detection
* **SDK Limitation**: Standard STT framing can trigger speech recognition prematurely while the IVR menu is still reading options.
* **Milo Requirement**: Keypad presses must be timed accurately. Sending DTMF tones while an IVR is still speaking can cause missed inputs on legacy PBX systems. Milo needs explicit end-of-prompt detection before dispatching DTMF tones.

### 4. Robust Error Recovery and Retry Loops
* **SDK Limitation**: LiveKit handles socket and transport errors, but does not manage logical IVR navigation failures.
* **Milo Requirement**: Milo must detect when an IVR states "Invalid entry, please try again," recognize menu loops, handle unexpected call disconnects, and retry navigation paths automatically.

### 5. Secure Credential and Context Injection
* **SDK Limitation**: LiveKit transmits raw audio/data packets without domain-specific data masking.
* **Milo Requirement**: Navigating support systems requires providing account numbers, PINs, date of birth, or social security digits via DTMF or speech. Milo requires secure prompt injection barriers and masked memory storage.

---

## 7. TS SDK Status

Since the user works in TypeScript, evaluating parity between `@livekit/agents` (TypeScript/Node.js) and `livekit-agents` (Python) is essential.

### Supported Features in TypeScript/Node.js
* **Real-time Voice Pipeline**: Full support for `voice.AgentSession`, VAD (`@livekit/agents-plugin-silero`), STT, LLM, and TTS orchestration.
* **SIP Participant Operations**: Creating outbound SIP participants via `LiveKitAPI.sip.createSipParticipant`.
* **DTMF Capabilities**: Sending DTMF via `localParticipant.publishDtmf(code, digit)` and receiving DTMF via `room.on(RoomEvent.DtmfReceived)`.
* **Transfers**: Cold transfers using `LiveKitAPI.sip.transferSipParticipant` and warm transfers using `WarmTransferTask`.
* **Answering Machine Detection**: Classifying call start using `voice.AMD` with `voice.AMDCategory` (`HUMAN`, `MACHINE_IVR`, `MACHINE_VM`, `MACHINE_UNAVAILABLE`, `UNCERTAIN`).

### Key Gaps and Differences in TypeScript
1. **Automatic IVR Navigation Hand-off**:
   * In Python, setting `ivr_detection=True` in `AgentSession` or AMD automatically hands off `machine-ivr` results to an automated IVR navigation mode within the framework.
   * In TypeScript, official documentation explicitly notes that the Node.js SDK does not support automatic IVR navigation hand-off. When AMD returns `AMDCategory.MACHINE_IVR`, the TypeScript agent must handle it manually in application code.
2. **Prebuilt Agent Tasks**:
   * Prebuilt tools such as `send_dtmf_events` and specialized tasks like `GetDtmfTask` are primarily documented and feature-complete in the Python SDK. Equivalent helper utilities in TypeScript require custom wrapper functions around `publishDtmf`.

---

## Summary Matrix

| Feature | LiveKit Telephony / SDK | Milo Custom Layer Required | TS SDK Parity |
| :--- | :--- | :--- | :--- |
| **Outbound SIP Dialing** | `CreateSIPParticipant` API | Trunk credential management | Full |
| **DTMF Sending** | `publishDtmf` / RFC 4733 | Timing and sequence planner | Full |
| **Call Start Detection (AMD)** | `voice.AMD` / `AMD` | Custom prompt threshold tuning | Full |
| **Auto IVR Handoff** | Python `ivr_detection` | Multi-step IVR state machine | **Python only** |
| **Mid-Call Hold Detection** | Not provided | Continuous audio/LLM classifier | Custom required |
| **Cold Transfer** | `TransferSIPParticipant` | Escalation logic | Full |
| **Warm Transfer** | `WarmTransferTask` | Context summarization prompt | Full |
