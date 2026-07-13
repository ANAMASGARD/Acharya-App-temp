# LiveKit release process
_Exported on 7/13/2026 at 22:00:06 GMT+5:30 from Cursor (3.9.16)_

---

**User**

Now, as previously for expo, we actually build it using the, like the LiveKit for the Sarvam voice conversational AI agent. I want you to implement in the manner so that it works when we create an app, when we bundle it inside the application completely. LiveKit, the voice conversational, it should work properly 100%. Like, I want you to now release the application, create this kind of scripts in the codebase so that anyone can build the application from ground up by running these two commands with the help of local, in the end, we get a release application so that we actually have to submit this application to the judges also in the GitHub.
----
source scripts/android-env.sh
  npm run android:standalone-apk
---
ALSO PLEASE WE HAVE TO ADD IN README LIEK A LINK BECASUE WE ARE ASKED FOR THE DEPLOYEMNT SO IN THE GITHUB WE CAN GIVE A RELEASE APK THAT THEY CAN DOWNLOAD FROM THE  GITHUB 
-----
https://github.com/anandnet/Harmony-Music/releases/tag/v1.12.2
----
LIKE THIS WAY YOU CAN SEE HOW PROFESSIONAL APPS ARE BUILD AND GIVE APK LINK SO THAT THIS KIND OF BUTTON IN THE TOP GITHUB README PLEASE , SO THAT IN THE DEPLOYEMNT IN THE SUBMISSION WE CAN GIVE APK OF THE APP AND THE LINK  LIKE I HAVE SHOWN IN THE IMAGE PLEASE , MAKE IT WORK OK PLEASE LIKE PROFESSIONAL APPS ALSO EACH APK RELEASE DOESN'T NEED TO HAVE DESCRIPTION BUT PROPER DOWNLOAD BUTTONA ND STUFF.

---

**Cursor**

I'll inspect the current LiveKit/voice setup, Android build scripts, and README so we can plan a reliable standalone APK release flow with GitHub download badges.

There's a likely LiveKit client-config issue for release builds — I'll verify how transport selection and env vars work in the APK path.

One blocker before I finalize the plan: the release APK must call a **public API** for LiveKit session tokens (secrets stay server-side). Confirming that and the README badge target.

I have enough to plan: local Gradle APK flow as you specified, LiveKit transport fix for release builds, and a Harmony-style GitHub download badge on the README.

---

**User**

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

---

**Cursor**

I'll implement the plan step by step, starting with the LiveKit transport fix for release builds.


All planned work is done. Here’s what was implemented:

### LiveKit in standalone APK
- [`lib/voice/transport.ts`](lib/voice/transport.ts) — APK always uses LiveKit when not in Expo Go (no client-side secret check)
- [`lib/voice/session-token.ts`](lib/voice/session-token.ts) — LiveKit sessions always mint `sessionToken` via `requireVoiceSecrets()`

### Android release build
- [`app.json`](app.json) — `com.acharya.app` package/bundle ID
- [`eas.json`](eas.json) — `standalone` + `production` APK profiles
- [`scripts/android-env.sh`](scripts/android-env.sh) — source for JDK/Android SDK + `.env`
- [`scripts/android-standalone-apk.sh`](scripts/android-standalone-apk.sh) — full release pipeline
- [`scripts/configure-android-release-signing.sh`](scripts/configure-android-release-signing.sh) — debug signing for sideload APKs
- [`scripts/publish-github-release.sh`](scripts/publish-github-release.sh) — `gh release create` helper
- `npm run android:standalone-apk` wired in [`package.json`](package.json)

### README + docs
- Download badge → `https://github.com/ANAMASGARD/Acharya-App/releases/latest`
- Badge image at [`assets/badges/get-it-on-github.png`](assets/badges/get-it-on-github.png)
- [`docs/VOICE.md`](docs/VOICE.md) and [`memory/memory.md`](memory/memory.md) updated

### Build & publish (your two commands)

```bash
source scripts/android-env.sh
npm run android:standalone-apk
```

**Before building**, set in `.env`:
- `EXPO_PUBLIC_API_URL` — your deployed API URL
- `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`
- Deploy LiveKit agent: `bash scripts/deploy-voice-livekit.sh`

APK output: `dist/acharya-1.0.0.apk`

**Publish for judges:**
```bash
bash scripts/publish-github-release.sh v1.0.0 dist/acharya-1.0.0.apk
```

`npm run lint` and `npx tsc --noEmit` both pass.

---

**User**

EXPO_PUBLIC_API_URL — your deployed API URL
what is this also did you upsated the @README.md  please make it best possible 

---

**Cursor**

I'll check how `EXPO_PUBLIC_API_URL` is used in the app and review the current README so I can explain it clearly and improve the docs.


I'll explain `EXPO_PUBLIC_API_URL` clearly and polish the README with a judge-friendly deployment section.


## What is `EXPO_PUBLIC_API_URL`?

It is the **public address of your Acharya backend** — the server that runs `app/api/**` (voice sessions, chat, recorder, Neo4j, etc.).

| Mode | How API is found |
|------|------------------|
| **Expo Go** (dev) | Automatic — uses your laptop IP from Metro, e.g. `http://192.168.1.5:8081` |
| **Standalone APK** | **You must set it** — baked into the APK at build time |

When someone installs the APK on a phone, there is no Metro dev server. The app calls:

```
{EXPO_PUBLIC_API_URL}/api/voice/session
{EXPO_PUBLIC_API_URL}/api/chat/completions
{EXPO_PUBLIC_API_URL}/api/health/neo4j
...etc
```

### What to put in `.env`

```env
EXPO_PUBLIC_API_URL=https://your-deployed-api-url.com
ACHARYA_API_BASE_URL=https://your-deployed-api-url.com   # same URL for LiveKit agent
```

No trailing slash. Use **HTTPS** in production.

### How to get that URL

1. **EAS Hosting** (fits this Expo project):
   ```bash
   npx eas deploy --prod
   ```
   You get something like `https://acharya-app--xxxx.expo.app` — put that in `.env`.

2. **Any public host** where this repo’s API routes run with your secrets (VPS, Railway, Render, etc.).

**Server secrets** (`CLERK_SECRET_KEY`, `NEO4J_*`, `SARVAM_API_KEY`, `LIVEKIT_*`) stay on that server only — never in the APK. The APK only needs `EXPO_PUBLIC_API_URL` + `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` at build time.

---

## README updated

Yes — [`README.md`](README.md) was updated with:

- Download badge (GitHub Releases)
- **Dedicated “What is EXPO_PUBLIC_API_URL?”** section with table, examples, and deploy steps
- Features overview
- Build + publish APK commands
- Expo Go vs APK voice comparison
- **Submission checklist** for judges (APK link + API URL)
- Clearer scripts table and links

[`.env.example`](.env.example) also has clearer comments for this variable.

If you share where you plan to host the API (EAS Hosting vs another provider), I can help you pick the exact URL to put in `.env`.

---

**User**

❯ npx eas deploy --prod
npm error could not determine executable to run
npm error A complete log of this run can be found in: /home/linux/.npm/_logs/2026-07-13T15_13_13_251Z-debug-0.log

----
░▒▓   …/acharya-app   codex/production-hardening !?   v24.13.0   20:43  
❯ git status 
On branch codex/production-hardening
Changes not staged for commit:
  (use "git add <file>..." to update what will be committed)
  (use "git restore <file>..." to discard changes in working directory)
        modified:   .env.example
        modified:   .gitignore
        modified:   README.md
        modified:   app.json
        modified:   docs/VOICE.md
        modified:   eas.json
        modified:   lib/voice/session-token.ts
        modified:   lib/voice/transport.ts
        modified:   memory/memory.md
        modified:   package.json

Untracked files:
  (use "git add <file>..." to include in what will be committed)
        assets/badges/
        scripts/android-env.sh
        scripts/android-standalone-apk.sh
        scripts/configure-android-release-signing.sh
        scripts/publish-github-release.sh

no changes added to commit (use "git add" and/or "git commit -a")

░▒▓   …/acharya-app   codex/production-hardening !?   v24.13.0   20:43  
❯ 
------
PLEASE DO IT ALL WORK ME MAKE IT WORK IT DO IT VERY LITTLE TIME IS LEFT SO THAT IS WHY PLEASE DO IT FAST 

---

**Cursor**

`eas-cli` isn't installed — that's why `npx eas deploy` failed. I'll fix the setup and get deployment running.


Installing `eas-cli`, adding deploy scripts, and attempting the full deploy + APK pipeline.


EAS login succeeded. Deploying the API now.


EAS login succeeded. Deploying the API.


API deployed. Verifying it and starting the APK build.


The deploy used a stale static export — API routes weren't included. Forcing a fresh server export and redeploying.


Fixing the web export (LiveKit breaks server deploy) and ensuring `.env` has the API URL.


Web export succeeded. Redeploying and building the APK.


API is live. Starting the APK build.


---

**User**

we just have to give an androdi apk link and apk file wehich we can build locally and then push to github why is it taking so much time please make sure app is fully functional that's all please ok 

---

**Cursor**

Focusing on a local APK build and GitHub release — checking the build status and fixing blockers.


Gradle build is still running (first build is slow). Fixing the Neo4j API issue in parallel so the app works when the APK is ready.


---

**User**

continue run and make the build the apk file the release apk file aslo fix all the neoj4 errors and any other api key errors so that final apk app should work proeprly 100 eprcent 

---

**Cursor**

I'll pick up the release APK build, fix Neo4j/API config, and verify the deployed backend before publishing.


Gradle build is progressing. Waiting for it to finish.


---

**User**

on the app it is showing as the netowrk failed please test all teh api keys they are working properly for the api fiel please also i want you to cheange the app icon use this image as the icon please @assets/images/3.png , and remove the actual default icon that comes with the react native please amke the app work 

---

**Cursor**

I'll fix the API/network issues, switch the app icon to `assets/images/3.png`, and verify the release build.


The APK is a dev client pointing at Metro, not a standalone release — that's likely the network failure. I'll fix the build, API config, and app icon.


The APK is a dev client trying to reach Metro on your laptop — that's the network failure. I'll build a true standalone release, fix the API/Neo4j config, and set the new icon.


Neo4j Aura is paused — that's blocking the app. Rebuilding a true standalone APK (no dev client) and pushing the fixed config.


`EXPO_PUBLIC_API_URL` isn't in the release bundle — I'll bake the API URL into the app config and rebuild.


---

**User**

This is hte error i am getting in the usb connected app please remove them also please make sure these errors don't come in the neoj4 and in the apk file which we will use for the demo purpose please pleas ealso nothing is workin in the PLeas einvestigate nothing is working in the apk so please re genrate the apk file after making all the fix please not even teh sarvam ai is wroking what is th eissue do deep research 
/thermo-nuclear-code-quality-review /brainstorming 

---

**Cursor**

The screenshots show a Neo4j Aura discovery failure (empty routing table, `database=dcbff5fe`). I'll investigate the deployed API config, local env, and APK wiring before drafting a fix plan.

Root cause is clear: Aura host `dcbff5fe` does not resolve (paused/deleted), so the API returns Neo4j discovery errors and every feature that hits Neo4j fails — including paths that look like “Sarvam broken.” One prerequisite before we finalize the plan:

---

**User**

<timestamp>Monday, Jul 13, 2026, 9:34 PM (UTC+5:30)</timestamp>
<system_notification>
The following task has finished. If you were already aware, ignore this notification and do not restate prior responses.

<task>
kind: shell
status: aborted
task_id: 490861
title: Start APK release build
output_path: /home/linux/.cursor/projects/home-linux-Downloads-acharya-app/terminals/490861.txt
</task>
</system_notification>
<user_query>Briefly inform the user about the task result and perform any follow-up actions (if needed). If there's no follow-ups needed, don't explicitly say that.</user_query>

---

**Cursor**

That earlier APK build was **aborted** mid-run (Gradle was still compiling when it stopped).

A later standalone build did finish (`dist/acharya-1.0.1.apk`). The phone errors you’re seeing are from **Neo4j Aura being unreachable** (paused/deleted instance `dcbff5fe`), not from that aborted build.

**Next:** resume Aura in [console.neo4j.io](https://console.neo4j.io), then approve the fix plan so we can redeploy the API and regenerate a clean demo APK.

---

**User**

this db is not working it is pasued what to do to make it work in the free trial 

---

**Cursor**

Confirmed: **Acharya-App (`dcbff5fe`) is PAUSED** — that’s why the APK and API show Neo4j discovery errors. Updating the plan with exact resume steps for Aura Free.

Your **Acharya-App** DB (`dcbff5fe`) is **PAUSED**. Aura Free does that after a few days of no use. The data is still there (you still show ~2.3k nodes) — you just need to wake it up.

### What to do (Free / trial)

1. Go to [https://console.neo4j.io](https://console.neo4j.io) → project **Acharya-App** → **Instances**
2. On the **Acharya-App** card (`dcbff5fe`), open the **⋯** menu (or click the instance)
3. Click **Resume** / **Resume instance**
4. Wait until status is **Running** (usually 1–3 minutes)

Keep using this same instance. Your `.env` URI (`neo4j+s://dcbff5fe.databases.neo4j.io`) and password stay the same unless you reset the password.

### About “Instance01” Creating…

You don’t need a second DB for the demo. Resume **Acharya-App** so you keep the existing graph. You can delete **Instance01** later if you don’t need it.

### After it’s Running

Tell me (or switch to Agent and say **execute the plan**) and we’ll:

1. Verify Neo4j  
2. Redeploy the API  
3. Rebuild the APK  

Until Aura is **Running**, Home/Chat/Sarvam will keep failing — the APK is fine; the database is asleep.

---

**User**

tell me how to make it work i think my free trial is over or the free instance that they provide cna i go to the trial 14 day if i enable it will it start working thne 

---

**Cursor**

Your trial is **not** over. The console already showed **“Trial – 14 days left.”** What’s wrong is simpler: the Free DB **Acharya-App** is **PAUSED**.

### Free instance vs 14-day trial

| | What it is |
|---|---|
| **AuraDB Free** | Always-available free DB. Neo4j **auto-pauses** it after a few days of no use. Your data stays (you still have ~2k nodes). |
| **14-day Trial** | Extra trial features/credits on the account. Having trial days left does **not** auto-wake a paused Free instance. |

So: enabling or using the trial does **not** by itself fix the APK. You must **Resume** the paused Free instance.

### What you should do

1. Open [console.neo4j.io](https://console.neo4j.io) → project **Acharya-App** → **Instances**
2. On **Acharya-App** (`dcbff5fe`) — status **PAUSED**
3. Click **⋯** (or the instance) → **Resume** / **Resume instance**
4. Wait until it says **Running** (1–3 minutes)

Then the same URI in your `.env` (`neo4j+s://dcbff5fe.databases.neo4j.io`) will work again. No new password needed unless you reset it.

### You do **not** need to

- Create a second instance (**Instance01**) just to “enable trial”
- Upgrade to paid only to unpause Free
- Change app code for this specific error

### After it’s Running

The app/API will work again once Neo4j is up. If the API was deployed while Aura was paused, you may still need a quick redeploy + APK rebuild — switch to **Agent mode** and say “execute the plan” for that.

**Bottom line:** Trial is fine. Click **Resume** on the paused Free DB. That is what makes it work.

---

**User**

  what doe s this mean is it live again 

---

**Cursor**

**Partly live — but not the DB your app uses yet.**

| Instance | Status | What it is |
|----------|--------|------------|
| **Acharya-App** (`dcbff5fe`) | **PAUSED** | Your real data (~2,369 nodes). App `.env` still points here. |
| **Instance01** (`7d4ca06d`) | **RUNNING** | New Professional **trial** DB (empty). Not wired into Acharya yet. |

So: trial Instance01 is live. The Acharya app is still talking to the **paused** Free DB → same Neo4j errors until you change that.

### Best option for demo (keep your data)

1. On **Acharya-App** → **⋯** → **Resume**
2. Wait until it says **Running**
3. Leave `.env` as-is (`dcbff5fe`)
4. Then redeploy API / rebuild APK if needed

You do **not** need Instance01 for that.

### If you want to use Instance01 instead

You must:

1. **Connect** on Instance01 → copy URI / password  
2. Update `.env`:
   - `NEO4J_URI=neo4j+s://7d4ca06d.databases.neo4j.io`
   - `NEO4J_PASSWORD=…` (the new one)
   - `NEO4J_USERNAME=neo4j`
   - `NEO4J_DATABASE=neo4j`
3. Apply schema + re-ingest data (Instance01 starts empty)
4. Redeploy API and rebuild APK

**Summary:** Instance01 running ≠ Acharya live again. Resume **Acharya-App**, or switch credentials to Instance01 and reload data.

---

**User**


---
Which is right now published that app like the instance is working but the old APK which we have just published. I download that APK in my android device but the loading is still happening and the app is still not working. The instance has just gone live. So please again check what are the things which are left in the code base to make it work.
----
do i need to rebuild the apk and new version an dpublish it what to do 
---
The app is still giving this warning like could not perform discovery, no routing server available, no routing table, routing table, database equals to again that problem.

---

**Cursor**

Aura is Running — the old APK should work once the API can reach Neo4j again. I'll verify connectivity, redeploy the API, then tell you if a new APK is needed.

Aura DNS is up, but auth is failing locally and the deployed API still can't connect. Checking credentials and fixing the deploy.

Found the issue: credentials must be username `dcbff5fe` and database `dcbff5fe` (not `neo4j`). Fixing `.env` and redeploying the API — no new APK needed if the API URL stays the same.

Neo4j is verified. Fixing the Expo config error that's blocking deploy.

Local Neo4j works; EAS Hosting (Workers) can't use Bolt TCP. Switching the API to Neo4j's HTTP Query API.

---

**User**

please fix the neoj4 and directly deploy the apk file no need to this expo deplyment link and stuff remeber that ok only apk is need so pleas efix this neoj4 errors please fast 

