# Field testing: how to measure listener delay

A practical guide for testing LANStreamer at a venue before an event, and for reporting problems in a way we can act on. It builds on the method the Nigeria team used in November 2026, which worked well.

**Expected results on a healthy network:**

| Listener | Expected delay |
|---|---|
| Laptop on a network cable | about 1 second |
| Android phone or laptop on Wi-Fi (Chrome, Edge, Firefox) | about 1–1.5 seconds |
| iPhone (any browser) | a few seconds more, by design: browsers on iPhone can't use the fast player |

If a Wi-Fi listener is much slower than a cabled one *on the same stream at the same time*, the problem is on the Wi-Fi side, not the PC.

---

## 1. The 1-second test (pause test)

You measure how long it takes for the listener to go quiet after you stop the sound on the PC.

1. On the streaming PC, play something with **clear, continuous sound**: music or speech in VLC, routed into the cable LANStreamer streams from (e.g. VLC → Audio → Audio Device → *CABLE Input*).
2. On the listener device, open the listener page, pick the channel and press play. Keep the page **in front**, with the screen on.
3. Stand where you can see the PC screen and hear the listener device.
4. Press **pause** in VLC and count until the listener goes silent. Repeat 3 times and write down the middle value.

**More precise: film it.** Put the listener device next to the PC screen and record a video on a second phone, with the PC visible and the listener device audible. Pause VLC. When you play the video back, step frame by frame: the gap between the pause button changing and the sound stopping is the delay. At 30 frames per second, every 3 frames is 0.1 s.

**Tips**
- Use the listener device's **own speaker or wired earphones**. Bluetooth earphones add 0.1–0.3 s of their own.
- Measure from the moment the sound stops **in VLC** (its level meter drops), not from the PC's speakers: PC speakers have their own small delay.
- Measure 20–30 seconds after the listener starts playing, not straight away. The first seconds after joining are always a little slower.

## 2. Compare cable and Wi-Fi at the same time

One number on its own doesn't tell us much. Test at least **three listeners together, on the same stream**:

- a laptop on a **network cable** (the reference: shows what the PC side delivers),
- a **phone on Wi-Fi**,
- a **laptop on Wi-Fi**.

Write down for each: device, browser, cable or Wi-Fi, and the delay.

## 3. The 1-hour test (does it creep up?)

Some problems only show after a while. Leave the stream running for an hour with all three listeners playing, and repeat the pause test every 15 minutes.

If a listener gets slow, do this **before anything else**:

1. Check the **cabled** listener: is it still about 1 second?
2. **Reload the listener page** on the slow device and press play again. Is it back to about 1 second?

What the answers mean:

| Cabled listener | After reloading the slow device | Most likely cause |
|---|---|---|
| Still ~1 s | Back to ~1 s | That device's Wi-Fi dropped briefly and its player fell behind. Fixed in v2.1.0; on 2.0.0 reloading is the workaround. |
| Still ~1 s | Still slow | Weak or busy Wi-Fi at that spot. Move closer to the access point or try 5 GHz. |
| Also slow | (not needed) | Something on the PC side: the audio source, the virtual cable, or the PC itself. Tell us right away. |

## 4. Change one thing at a time

To find where a delay comes from, change only one thing per round and repeat sections 1–2:

- **Router or access point:** home router versus the venue/industrial router.
- **Distance:** next to the access point versus the far end of the room.
- **Wi-Fi band:** 5 GHz versus 2.4 GHz (5 GHz is usually faster and less crowded).
- **Audio source:** VB-CABLE versus a microphone or line-in on the PC.
- **Bitrate:** 96 kbps (speech) versus 192 kbps (music).

## 5. What to send us

Send a short message with:

1. **The LANStreamer version.** It's shown next to the logo on the dashboard (v2.1.0 and later). On 2.0.0, give the installer file name.
2. **A results table** like this:

   | Time | Device | Browser | Cable / Wi-Fi | Router | Delay |
   |---|---|---|---|---|---|
   | 10:00 | Laptop | Edge | Cable | Venue router | 1.0 s |
   | 10:00 | Phone | Chrome | Wi-Fi | Venue router | 1.2 s |
   | 10:15 | Phone | Chrome | Wi-Fi | Venue router | 5.5 s → reload → 1.1 s |

3. **The audio source** you streamed from (for example "CABLE Output (VB-Audio Virtual Cable)").
4. **If the PC has no internet:** Dashboard → Admin account → **Export diagnostics**, and send the file. With internet, the anonymous statistics reach us by themselves.
5. **A short video** of the pause test, if you have one.

## 6. Before a real event

- Do the 1-second test with a cabled laptop and a Wi-Fi phone **at the venue, on the venue's network**.
- Change the default admin login (Dashboard → Admin account).
- If the Windows network is marked **Public**, listeners can't connect. Set it to Private.
- Plug the streaming PC into the router with a cable if you can.
- Ask listeners to use the listener page in the browser, keep it open in front, and not use Bluetooth earphones if timing matters.

More about how the delay is kept low: [LATENCY.md](LATENCY.md). Other problems: [TROUBLESHOOTING.md](TROUBLESHOOTING.md).
