import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import HeroMockup from "@/app/components/HeroMockup";
import Logo from "@/app/components/Logo";
import Reveal from "@/app/components/Reveal";

const FEATURES = [
  {
    title: "GPS-gated uploads",
    desc: "Workers can only submit photo proof when their phone confirms they're within 150m of the job site.",
  },
  {
    title: "Automatic timestamping",
    desc: "Every photo and remark is stamped the moment it's captured — no manual entry, no editing after the fact.",
  },
  {
    title: "One-click client reports",
    desc: "Bundle a job's full timeline into a branded, printable report a client can open without logging in.",
  },
  {
    title: "Boss override, always",
    desc: "Admins can edit any task, add proof from a desktop, or correct a record — full control stays with the owner.",
  },
  {
    title: "Filterable task board",
    desc: "See every job by status or priority across your whole crew, not scattered across group chats.",
  },
  {
    title: "Storage & plan tracking",
    desc: "Know exactly how much photo storage your team is using before you hit a plan limit.",
  },
];

const SHARED_PERKS = [
  "Unlimited workers",
  "Unlimited tasks & jobs",
  "GPS-verified photo & video proof",
  "One-click client report links",
  "Team schedule & task board",
];

const PLANS = [
  {
    name: "Starter",
    price: 30,
    storage: "1GB photo storage",
    blurb: "Solo operators and small crews just getting proof-of-work off WhatsApp.",
    popular: false,
  },
  {
    name: "Pro",
    price: 99,
    storage: "5GB photo storage",
    blurb: "Growing crews shooting more photo & video across more jobs each month.",
    popular: true,
  },
];

const FAQS = [
  {
    q: "Does JobSnap work if my workers don't have smartphones?",
    a: "Workers need a basic Android or iPhone with GPS and a camera — nothing fancier. Most crews already carry one.",
  },
  {
    q: "What happens if a worker isn't at the job site?",
    a: "They can still open the job and write notes, but photo uploads are blocked until GPS confirms they're within 150m of the site address.",
  },
  {
    q: "Can I use JobSnap in Bahasa Malaysia?",
    a: "The dashboard is in English today; Malay-language WhatsApp onboarding materials are available, with full BM support on our roadmap.",
  },
  {
    q: "Can clients see the dashboard directly?",
    a: "No — clients only see the report pages you generate and share. They don't need an account or login.",
  },
  {
    q: "What happens if I run out of photo storage?",
    a: "You'll get a heads-up before you hit the limit, and can upgrade to Pro anytime without losing any job history.",
  },
];

export default function Home() {
  return (
    <main>
      {/* Nav */}
      <div className="sticky top-0 z-50 border-b border-border-strong/70 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center gap-8 px-6 py-4 sm:px-12">
          <Link href="/" className="flex items-center gap-2.5">
            <Logo size={30} />
            <span className="text-[19px] font-extrabold tracking-tight text-primary">JobSnap</span>
          </Link>
          <div className="hidden flex-1 items-center gap-7 sm:flex">
            <a href="#howitworks" className="text-[14.5px] font-semibold text-body-text hover:text-ink">
              How it works
            </a>
            <a href="#features" className="text-[14.5px] font-semibold text-body-text hover:text-ink">
              Features
            </a>
            <a href="#pricing" className="text-[14.5px] font-semibold text-body-text hover:text-ink">
              Pricing
            </a>
            <a href="#faq" className="text-[14.5px] font-semibold text-body-text hover:text-ink">
              FAQ
            </a>
          </div>
          <div className="ml-auto flex gap-2.5">
            <Link
              href="/login"
              className="rounded-lg border border-input px-[18px] py-2 text-sm font-semibold text-primary hover:bg-accent"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="rounded-lg bg-primary px-[18px] py-2 text-sm font-semibold text-white hover:bg-[var(--primary-hover)]"
            >
              Start free trial
            </Link>
          </div>
        </div>
      </div>

      {/* Hero */}
      <div className="mx-auto grid max-w-6xl gap-14 px-6 pb-12 pt-16 sm:px-12 lg:grid-cols-2 lg:items-center">
        <Reveal>
          <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-secondary px-3.5 py-1.5 text-[13px] font-bold text-secondary-foreground">
            Built for Malaysian field service teams
          </div>
          <h1 className="mb-5 text-[52px] font-extrabold leading-[1.08] tracking-tight text-ink text-pretty">
            Stop digging through WhatsApp groups for proof of work.
          </h1>
          <p className="mb-8 max-w-[480px] text-[18.5px] leading-relaxed text-body-text">
            JobSnap gives every job a timestamped, GPS-verified photo trail — so your team stops
            arguing about who went where, and your clients stop asking for proof twice.
          </p>
          <div className="mb-6 flex flex-wrap gap-3">
            <Link
              href="/signup"
              className="rounded-[9px] bg-primary px-7 py-[15px] text-base font-bold text-white shadow-[0_8px_20px_-8px_rgba(36,52,58,0.55)] transition hover:-translate-y-px hover:bg-[var(--primary-hover)]"
            >
              Start free trial
            </Link>
            <a
              href="#howitworks"
              className="rounded-[9px] border border-input bg-card px-7 py-[15px] text-base font-bold text-primary hover:bg-accent"
            >
              Watch 2-min demo
            </a>
          </div>
          <p className="text-[13px] text-muted-foreground">
            First month free · From RM30/mo after · Cancel anytime
          </p>
        </Reveal>

        <Reveal delay={150}>
          <HeroMockup />
        </Reveal>
      </div>

      {/* Before/after */}
      <div className="border-y border-border-strong bg-card px-6 py-16 sm:px-12">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <h2 className="mb-2 text-center text-[30px] font-extrabold tracking-tight text-ink">
              The proof problem, before and after
            </h2>
            <p className="mb-10 text-center text-base text-muted-foreground">
              Same crew. Same jobs. Completely different accountability.
            </p>
          </Reveal>
          <div className="grid gap-6 sm:grid-cols-2">
            <Reveal>
              <div className="card-shadow rounded-2xl border border-border p-7">
                <p className="mb-4 text-xs font-bold uppercase tracking-wide text-destructive">Without JobSnap</p>
                <ul className="list-disc space-y-0 pl-5 text-[15px] leading-[2] text-body-text">
                  <li>Photos scattered across 6 WhatsApp group chats</li>
                  <li>No way to confirm a worker was actually on-site</li>
                  <li>Boss manually screenshots proof for each client, every month</li>
                  <li>Disputes over &ldquo;did anyone even show up?&rdquo;</li>
                </ul>
              </div>
            </Reveal>
            <Reveal delay={120}>
              <div className="rounded-xl border-2 border-primary bg-background p-7">
                <p className="mb-4 text-xs font-bold uppercase tracking-wide text-success">With JobSnap</p>
                <ul className="list-disc space-y-0 pl-5 text-[15px] leading-[2] text-ink">
                  <li>Every job has one timeline, GPS-locked to the address</li>
                  <li>Photos can&apos;t be uploaded unless the worker is within 150m of site</li>
                  <li>Client reports generate in one click, branded and dated</li>
                  <li>&ldquo;Who went, when, where, what&rdquo; — answered instantly</li>
                </ul>
              </div>
            </Reveal>
          </div>
        </div>
      </div>

      {/* How it works */}
      <div id="howitworks" className="mx-auto max-w-6xl px-6 py-[72px] sm:px-12">
        <Reveal>
          <h2 className="mb-11 text-center text-[30px] font-extrabold tracking-tight text-ink">How it works</h2>
        </Reveal>
        <div className="grid gap-8 sm:grid-cols-3">
          <Reveal>
            <Step n="1" title="Boss assigns the job">
              Pick a worker, a job type, and a client from the dashboard. Takes under a minute.
            </Step>
          </Reveal>
          <Reveal delay={100}>
            <Step n="2" title="Worker snaps proof on-site">
              Photo, remark, done — GPS and timestamp attach automatically. No GPS lock, no upload.
            </Step>
          </Reveal>
          <Reveal delay={200}>
            <Step n="3" title="Client gets the report">
              One click bundles the timeline into a branded, printable report — no login needed to view.
            </Step>
          </Reveal>
        </div>
      </div>

      {/* Features */}
      <div id="features" className="bg-primary px-6 py-[72px] sm:px-12">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <h2 className="mb-11 text-center text-[30px] font-extrabold tracking-tight text-white">
              Everything a field crew actually needs
            </h2>
          </Reveal>
          <div className="grid gap-5 sm:grid-cols-3">
            {FEATURES.map((f, i) => (
              <Reveal key={f.title} delay={(i % 3) * 90}>
                <div className="rounded-2xl border border-border bg-card p-[26px] transition hover:-translate-y-1 hover:border-steel">
                  <div className="mb-4 h-9 w-9 rounded-[9px] bg-steel" />
                  <h3 className="mb-2 text-[16.5px] font-bold text-white">{f.title}</h3>
                  <p className="text-sm leading-relaxed text-primary-foreground/75">{f.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>

      {/* Pricing */}
      <div id="pricing" className="mx-auto max-w-6xl px-6 py-[72px] sm:px-12">
        <Reveal>
          <h2 className="mb-2 text-center text-[30px] font-extrabold tracking-tight text-ink">
            One price for the whole crew, not per seat
          </h2>
          <p className="mb-4 text-center text-base text-muted-foreground">
            Unlimited workers on every plan — the only thing that changes is photo storage.
          </p>
          <div className="mb-11 flex justify-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-1.5 text-[13px] font-bold text-secondary-foreground">
              <CheckCircle2 className="h-3.5 w-3.5" />
              First month free on either plan
            </span>
          </div>
        </Reveal>
        <div className="mx-auto grid max-w-[720px] gap-6 sm:grid-cols-2">
          {PLANS.map((p, i) => (
            <Reveal key={p.name} delay={i * 100}>
              <div
                className={`card-shadow relative h-full rounded-2xl p-8 ${
                  p.popular ? "border-2 border-primary bg-accent" : "border border-border-strong bg-card"
                }`}
              >
                {p.popular && (
                  <div className="absolute -top-[13px] left-1/2 -translate-x-1/2 rounded-full bg-icy px-3.5 py-[5px] text-[11px] font-extrabold uppercase tracking-wide text-icy-foreground shadow-[0_4px_10px_-4px_rgba(36,52,58,0.3)]">
                    For growing crews
                  </div>
                )}
                <p className="mb-1 text-sm font-bold uppercase tracking-wide text-primary">{p.name}</p>
                <p className="mb-1">
                  <span className="text-[38px] font-extrabold tracking-tight text-ink">RM{p.price}</span>
                  <span className="text-sm text-muted-foreground">/mo</span>
                </p>
                <p className="mb-1 text-[13.5px] font-semibold text-ink">{p.storage}</p>
                <p className="mb-6 text-[13px] leading-relaxed text-muted-foreground">{p.blurb}</p>
                <Link
                  href="/signup"
                  className={`mb-5 block w-full rounded-[9px] py-[13px] text-center text-[14.5px] font-bold transition hover:opacity-85 ${
                    p.popular ? "bg-primary text-white" : "border border-input bg-card text-primary"
                  }`}
                >
                  Choose {p.name}
                </Link>
                <div className="mb-4 h-px bg-border-strong" />
                {SHARED_PERKS.map((perk) => (
                  <p key={perk} className="mb-2.5 flex gap-2 text-[13.5px] text-body-text">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                    {perk}
                  </p>
                ))}
              </div>
            </Reveal>
          ))}
        </div>
        <p className="mt-6 text-center text-[13px] text-muted-foreground">
          Need more than 5GB? <a href="#faq" className="font-semibold text-primary hover:underline">Ask us</a> — we&apos;ll sort out a fit.
        </p>
      </div>

      {/* FAQ */}
      <div id="faq" className="border-t border-border-strong bg-card px-6 py-[72px] sm:px-12">
        <div className="mx-auto max-w-[760px]">
          <Reveal>
            <h2 className="mb-10 text-center text-[30px] font-extrabold tracking-tight text-ink">
              Frequently asked questions
            </h2>
          </Reveal>
          <Reveal>
            <div>
              {FAQS.map((f) => (
                <details key={f.q} className="group border-b border-border-strong py-[18px]">
                  <summary className="flex cursor-pointer list-none items-center justify-between marker:content-none">
                    <p className="text-base font-semibold text-ink">{f.q}</p>
                    <span className="text-xl text-muted-foreground transition-transform group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-3 max-w-[640px] text-[14.5px] leading-relaxed text-muted-foreground">{f.a}</p>
                </details>
              ))}
            </div>
          </Reveal>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-8 text-center sm:px-12">
        <p className="text-[13px] text-muted-foreground">
          © 2026 JobSnap Sdn Bhd. Kuala Lumpur, Malaysia. ·{" "}
          <Link href="/download" className="font-semibold text-primary hover:underline">
            Download the worker app
          </Link>
        </p>
      </div>
    </main>
  );
}

function Step({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <div className="text-center">
      <div className="mx-auto mb-[18px] flex h-[52px] w-[52px] items-center justify-center rounded-xl bg-primary text-xl font-extrabold text-white">
        {n}
      </div>
      <h3 className="mb-2 text-lg font-bold text-ink">{title}</h3>
      <p className="text-[14.5px] leading-relaxed text-muted-foreground">{children}</p>
    </div>
  );
}
