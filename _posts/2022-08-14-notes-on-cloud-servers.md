---
title: 'Cloud Servers and Deployment Architecture: From Domains to Reliable Operations'
uid: '202208142347'
author: Yiyu Chen
date: 2022-08-14 23:47:00 +0800
lang: en
permalink: /en/posts/notes-on-cloud-servers/
translation_key: post-202208142347
translation_url: /posts/云服务器折腾随笔/
translation_source: _posts/2022-08-14-云服务器折腾随笔.md
translation_status: current
source_hash: 57d56722c38c4f1288d618d03ae2bafd800455b331f6eee903c4bacb99d5dc0f
aliases: []
categories:
- Cloud Servers
tags:
- Cloud Servers
from: null
thumbnail: /assets/posts/202208142347/cover-cloud-console-2026-07-30.webp
article_cover:
  alt: Illustration of a cloud-server instance console
  caption: 'Cover: an illustration of a cloud-server instance console (created for this site); it depicts managing a VPS in a browser and does not represent the dashboard of any real cloud provider.'
excerpt: I began by asking how a domain, DNS, and a VPS fit together. Actual deployment brought network boundaries, identity, data recovery, and observability into the long-term maintenance scope.
description: A request-path guide to DNS, CDNs, proxies, cloud networks, compute, and storage, followed by checklists for product selection, secure deployment, cost review, and troubleshooting.
revisions:
- date: '2022-08-14'
  note: Initial draft
- date: '2026-08-08'
  note: Researched and rewritten by GPT-5.6 Sol as a vendor-neutral guide to cloud servers and deployment architecture; removed time-sensitive pricing, region, and software-ecosystem recommendations
- date: '2026-08-10'
  note: Standardized cloud-networking, observability, release, and recovery terminology; split high-load sentences and shortened repeated explanations
---

I began by asking how a domain name, the Domain Name System (DNS), and a virtual private server (VPS) fit together. Actual deployment brought network boundaries, identity, data recovery, and observability into the long-term maintenance scope.

This article presents vendor-neutral architectural logic. Prices, regions, plan quotas, free tiers, and product catalogs change, so recheck them on the provider’s official pages on the day of a purchase or deployment. The facts in this revision were checked on **2026-08-08**.

## First Draw the Complete Path of One Request

For an ordinary web service, one request can traverse all or some of these layers:

```text
Browser
  -> domain name and DNS
  -> CDN / edge reverse proxy
  -> load balancer
  -> cloud firewall / security group / routing / NAT
  -> cloud VM or container platform
  -> reverse proxy / application process
  -> database / object storage / external service
```

A small site often combines several layers: one VM can run both the reverse proxy and application, or a managed platform can provide TLS, routing, and compute together. Combining components does not erase their logical boundaries. During an incident, you still need to test each layer separately.

### Domain Names and DNS: A Name Is Not a Server

A domain is a stable public name, while DNS is a distributed naming system. A registrar maintains the registration relationship, an authoritative DNS service publishes resource records, and a recursive resolver queries and caches results for clients. [RFC 1034](https://datatracker.ietf.org/doc/html/rfc1034) defines this hierarchical, distributed, and cached model.

Common records for hosting include:

- `A` and `AAAA`: map a name to an IPv4 or IPv6 address, respectively.
- `CNAME`: makes one name an alias of another canonical name; it is not port forwarding.
- `MX`: identifies mail exchangers and their priorities.
- `TXT`: carries text required by a particular protocol, commonly for domain-control and email-policy verification.
- `SRV`: under [RFC 2782](https://datatracker.ietf.org/doc/html/rfc2782), publishes a service, protocol, target host, port, priority, and weight; a client uses it only if that client explicitly supports SRV.

A TTL is an upper bound on caching, not a promise that a change will “finish propagating worldwide” after a fixed time. Before a planned migration, lower the TTL in advance, restore a normal value afterward, and keep the old endpoint alive until old caches have mostly aged out.

### Responsibilities of CDNs, Reverse Proxies, and Load Balancers

- A **content delivery network (CDN)** caches reusable responses at edge locations near visitors, reducing origin requests and long-distance transfer. Dynamic requests, signed-in responses, and incorrect cache policies require separate handling.
- A **reverse proxy** receives client requests on behalf of backends. It can terminate TLS, route by hostname or path, enforce rate limits, and forward traffic to an application.
- A **load balancer** distributes requests among multiple available backends and commonly uses health checks to remove unhealthy nodes. With only one backend, it cannot create high availability by itself.

The [Cloudflare CDN reference architecture](https://developers.cloudflare.com/reference-architecture/architectures/cdn/) is one provider implementation: edge nodes sit in front of origins as reverse proxies and can answer from cache or fetch from the origin. Cache keys, origin behavior, health checks, and billing semantics differ by provider, so recheck the relevant official documentation on deployment day.

### Applications, Databases, and Object Storage: Separate Their Lifecycles

An application process should be replaceable where possible: code, dependencies, and startup behavior should be reconstructible from versioned configuration. Do not leave the sole copy of important data in one VM’s or container’s local filesystem.

- A **database** provides queries, indexes, concurrency control, and defined consistency semantics. It is suitable for application state and relational data.
- **Object storage** organizes files as keys, objects, and metadata. It is suitable for uploads, static assets, archives, and backups; do not assume it behaves like a normal mountable disk.
- **Block storage / a cloud volume** appears to a host as a disk and suits filesystems or database volumes. A snapshot is recovery material; it still needs an isolated copy and a restore exercise to meet the backup requirements.

Object versioning can reduce the recovery cost of accidental deletion and overwrite. For example, the [Amazon S3 Versioning documentation](https://docs.aws.amazon.com/AmazonS3/latest/userguide/Versioning.html) describes one implementation that retains multiple object versions. This mechanism covers version retention; when selecting a service, also verify consistency, locking, lifecycle rules, cross-region replication, and restore charges.

## Choosing Compute: Trading Control for Management

[NIST SP 800-145](https://csrc.nist.gov/pubs/sp/800/145/final) distinguishes IaaS, PaaS, and SaaS. Real compute products also use overlapping labels such as “containers,” “functions,” and “serverless.” When choosing a product, ask: Who manages the operating system? Who patches it? Can you choose the kernel, network, and runtime? What is the smallest scaling unit?

| Form | What you get | What you manage | Better suited to | Main cost |
| --- | --- | --- | --- | --- |
| VPS / cloud VM | A manageable virtual machine and configurable networking | OS, patches, runtime, capacity, and most failures | Root/admin access, custom software, or learning the whole system | High operational responsibility; host tenancy can affect isolation and performance variation |
| Bare metal | Direct use of a physical server without a customer-visible hypervisor layer | More system, hardware, and capacity planning | Hardware-level isolation, special licensing, predictable hardware, or specific accelerators | Larger starting cost and scaling unit |
| Container | A repeatable image of the application and user-space dependencies | Image, runtime configuration, secrets, state, and orchestration boundary | Consistent packaging, rapid releases, or multiple replicas | A container provides process isolation and a packaging boundary; self-managed orchestration adds complexity |
| Managed PaaS | A managed path from code or an image to a running service | Application, data, configuration, and product constraints | Web/API services, small teams, and long-running services without host management | Platform limits on runtime, networking, debugging, and portability |
| Function / serverless | A platform-scheduled execution unit triggered by events | Function code, permissions, events, and external state | Intermittent jobs, event processing, and elastically scaling APIs | Execution limits, cold starts, concurrency, debugging, and unit cost require a current product review |

Execution abstraction and hardware tenancy are separate axes. A VM may run on multi-tenant hardware, as a dedicated instance, or on a dedicated/sole-tenant host. A dedicated host still runs VMs and is not the same product as bare metal. Compare both dimensions explicitly; the [Google Cloud VM-tenancy guide](https://cloud.google.com/compute/docs/instances/about-vm-tenancy) and [Amazon EC2 Dedicated Hosts documentation](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/dedicated-hosts-overview.html) show two provider implementations.

“Container” and “serverless” are not points on the same classification axis. A container is a packaging and execution format that can run on a self-managed VM, a managed cluster, or a serverless container platform. The [Kubernetes container documentation](https://kubernetes.io/docs/concepts/containers/) emphasizes that an image includes code and runtime dependencies. The [Azure compute selection guide](https://learn.microsoft.com/en-us/azure/architecture/guide/technology-choices/compute-decision-tree) illustrates the practical exchange between control and management convenience across VMs, PaaS, containers, and FaaS. These links explain mechanisms; they are not unconditional product recommendations.

### A Practical Selection Order

1. **Write down the workload first:** Is it a continuously running web service, a scheduled job, a queue consumer, a database, or GPU computation?
2. **List non-negotiable boundaries:** OS, privileged ports, local disk, special networking, drivers, end-to-end latency, data residency, and compliance.
3. **Among candidates that satisfy those boundaries, choose the simplest option with the highest acceptable level of management.** Take on lower-level operations only after showing that platform constraints are unacceptable.
4. **Validate with a small prototype:** The prototype must cover release, rollback, scaling, logs, backup, restore, and worst-case monthly cost.

## Networking and TLS: Allow Only Required Traffic at Every Layer

### Public and Private Networks, Subnets, Routes, and NAT

The private IPv4 ranges reserved by [RFC 1918](https://datatracker.ietf.org/doc/html/rfc1918) are not globally routed on the public Internet. In AWS and platforms that use the same convention, a “public subnet” is a subnet whose route table reaches an Internet gateway. A workload also needs an Internet-routable address and permissive inbound filtering before it can receive new public connections. The [AWS Internet-gateway documentation](https://docs.aws.amazon.com/vpc/latest/userguide/VPC_Internet_Gateway.html) defines that convention. Other clouds may use different labels: [Azure models a public IP as a separate resource](https://learn.microsoft.com/en-us/azure/virtual-network/ip-services/public-ip-addresses), while [Google Cloud documents virtual private cloud (VPC) routes and firewall rules independently](https://cloud.google.com/vpc/docs/vpc). Across providers, determine reachability from the external address or edge endpoint, effective routes, and inbound filters.

- A **subnet** allocates workloads from part of a virtual network’s address range.
- A **route table** selects the next hop or gateway for a destination prefix.
- An **Internet or edge gateway**—under provider-specific names—can connect a virtual network to the public Internet, but a route does not mean a firewall has allowed the traffic.
- **Network address translation (NAT)** commonly lets private IPv4 resources initiate connections outward and receive response traffic through translated addresses and ports. It rejects new connections initiated from the Internet by default. The [AWS NAT mechanism documentation](https://docs.aws.amazon.com/vpc/latest/userguide/vpc-nat.html) provides one provider implementation of this behavior.

A common boundary for a small web system is to place only the load balancer or reverse proxy at the public entry point. Application instances and databases stay private. The database accepts its designated port only from the application identity or subnet; `0.0.0.0/0` stays outside the allowlist.

### Boundaries of Security Groups, Network ACLs, and Host Firewalls

Names differ between cloud platforms, but the controls can be separated by what they govern:

- A **cloud firewall / security group** commonly attaches to a network interface or resource and filters by source, destination, protocol, and port.
- A **network access control list (ACL)** commonly operates at the subnet boundary as a coarse guardrail. It may be stateless, so return traffic must also match rules.
- A **host firewall** filters inside the operating system and preserves a final constraint even if cloud-side rules are accidentally loosened.
- **Application authorization** determines which operations someone may perform after connecting. Network controls determine whether the connection can reach the application.

The [AWS security group documentation](https://docs.aws.amazon.com/vpc/latest/userguide/vpc-security-groups.html) shows one stateful, resource-level implementation. Before writing rules, build a real traffic matrix: “who → whom → which protocol/port → why,” and then implement each row. Do not leave all ports open simply because it is convenient during troubleshooting.

### A Port Is Only a Listener; TLS Can Have Two Legs

TCP 443 reachability requires a routable address, an effective route, permission through every firewall layer, and a process listening on the expected address. Serving HTTPS correctly for a hostname additionally requires DNS—or an explicit diagnostic override—plus the intended `Host`/SNI value, a valid certificate chain, and matching application routing. A port does not create a service, and allowing a security-group rule does not start a process that is not listening.

[TLS 1.3 is standardized in RFC 8446](https://datatracker.ietf.org/doc/html/rfc8446). When a CDN or edge proxy sits between a visitor and the origin, there are commonly two independent TLS legs:

1. **Visitor ↔ edge:** the edge presents the browser with a publicly trusted certificate matching the requested hostname.
2. **Edge ↔ origin:** the origin presents another certificate that the edge validates, and the connection should use a strict verification mode.

The [Cloudflare SSL/TLS overview](https://developers.cloudflare.com/ssl/) explicitly distinguishes edge and origin certificates. The [Cloudflare Origin CA documentation](https://developers.cloudflare.com/ssl/origin-configuration/origin-ca/) also warns that its Origin CA certificates are intended for a proxied edge-to-origin link. If the proxy is paused and a browser connects directly to such an origin, the browser may not trust the certificate. Therefore, “the CDN has HTTPS” does not prove that the origin connection is encrypted or authenticated.

## Security and Reliability: Deploy Recovery Alongside the Service

### Identity, Secrets, and Least Privilege

- Enable multi-factor authentication for human accounts, and do not use the root or owner account for routine work.
- Give people and workloads separate identities. Prefer short-lived credentials, workload identities, or instance roles; do not embed long-lived access keys in code, images, or repositories.
- Start with no permission, then add only the required “action + resource + condition.” Periodically remove unused permissions.
- Inject secrets through a dedicated secret service or deployment platform with rotation, revocation, and audit support. Do not log secrets, session tokens, or complete personal data.

The [AWS IAM security practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html) are one verifiable provider implementation: they recommend temporary credentials, MFA, least privilege, and regular cleanup of unused credentials. On another platform, use those capabilities to find equivalent identity and secret mechanisms.

### Patches, the Supply Chain, and Reproducible Deployment

A self-managed VM requires maintenance of its OS, runtime, reverse proxy, application, and dependencies. [NIST SP 800-40 Rev. 4](https://csrc.nist.gov/pubs/sp/800/40/r4/final) defines patch management as an ongoing preventive-maintenance process for identifying, prioritizing, acquiring, installing, and verifying updates.

Safe automation requires reviewable deployment inputs, pinned versions, verified integrity, least-privilege execution, and prior validation in staging or another rollback-capable environment. After an update, test service state and a critical request; a command's exit code covers only part of the execution outcome.

### A Backup Must Prove Itself Through a Restore Exercise

Define two targets first. The **recovery point objective (RPO)** is the acceptable time window of data loss before a failure. The **recovery time objective (RTO)** is the target duration for restoring the service to its required level after an interruption. These targets determine backup frequency, retention, replica location, and restoration procedure.

- Back up databases, objects, essential configuration, and the means to recover secrets. Temporary files that can be rebuilt from code and images do not need to enter the primary data backup.
- Isolate at least one recovery copy from the production failure domain. The right separation—credentials, account, project, region, or offline media—depends on the threat model.
- Monitor backup jobs and retention policies; validate data usability separately through a restore exercise.
- Regularly restore from an empty state into an isolated environment, then verify data integrity, application startup, permissions, and elapsed time.

[NIST SP 800-34 Rev. 1](https://csrc.nist.gov/pubs/sp/800/34/r1/upd1/final) places backup and recovery inside a full contingency plan and emphasizes testing, exercises, and continuing maintenance. Volume snapshots, automated database backups, and object versions can all be components, but each must participate in a real restore exercise.

### Logs, Metrics, Traces, and Alerts

- **Logs** record discrete events: when, in which component, and for which request something happened.
- **Metrics** express request rate, error rate, latency, saturation, and business outcomes as time series.
- **Traces** join the path of one request through proxies, applications, and downstream dependencies.
- **Alerts** aggregate signals by actionable conditions and notify the responsible person of an abnormal state.

The [OpenTelemetry signals overview](https://opentelemetry.io/docs/concepts/signals/) provides tool-neutral concepts for logs, metrics, and traces. A minimum operational monitoring set should include an external health check, HTTP errors and latency, host/container resources, database capacity and connections, backup outcomes, certificate expiry, and an alert-delivery path that has actually been tested.

## Costs and Providers: Compare a Complete Workload

Complete cost requires entering the same workload sheet into each candidate provider's official calculator on the same date, in the same currency, and under the same tax assumptions:

| Category | Inputs that must be recorded |
| --- | --- |
| Compute | Architecture, vCPU, memory, GPU, running hours, peak concurrency, scaling floor, and reservation/commitment term |
| Storage | Capacity, input/output operations per second (IOPS), throughput, snapshots, object request count, versions, and lifecycle rules |
| Network | Ingress, egress, cross-region/zone transfer, CDN origin traffic, public IPs, load balancers, and NAT |
| Platform | Database instances, backup retention, log ingestion/retention, secret requests, image registry, DNS queries, and support plan |
| Risk | Overage bounds, quotas, service-level agreement (SLA) prerequisites, failure domains, data residency, export methods, and deletion process |
| Labor | Patching, on-call work, database operations, security review, migration, and incident recovery time |

Use spending limits or budget alerts to control surprises, and determine whether each control sends a notification or forcibly stops services. Verify the billing behavior at the budget threshold. Save the date, region, rate-card version or screenshot, inputs, and assumptions for every comparison. Recalculate at purchase time; historical numbers provide context only.

Beyond price, measure latency, packet loss, and route stability from target users to candidate regions. Check support response, product retirement policy, data export, and exit costs. Network quality must be measured as “user location + time + carrier + region + protocol”; a single regional label carries too little information.

## A Rollback-Capable, Recoverable Deployment Workflow

1. **Define the service boundary:** record data classification, user locations, capacity, the service-level objective (SLO), RPO, RTO, compliance, and the budget ceiling.
2. **Draw the architecture and traffic matrix:** mark every component’s public/private boundary, ports, identities, storage location, and failure domain.
3. **Establish account guardrails:** protect the owner account; create separate identities, MFA, least privilege, audit logs, budget alerts, and quota alerts for routine administration.
4. **Define infrastructure and guardrails in one reviewable change:** prefer versioned infrastructure as code (IaC) or reproducible official tools; declare restrictive routes, security groups/firewalls, and the management path before any public endpoint is attached. Keep application and data resources private from creation, pin dependencies, review changes, and do not execute unreviewed remote scripts.
5. **Create resources without an exposure window:** verify the effective traffic matrix first, then create or attach only the intended public entry point. Reach the management plane through a VPN, identity-aware proxy, or restricted sources; connect applications, databases, and storage through minimum rules.
6. **Build a replaceable runtime:** use supported systems/runtimes, a non-privileged application user, and pinned, verified packages or images. Do not accumulate the sole configuration through manual edits on one machine.
7. **Configure secrets and TLS:** inject secrets through a secret service, automate certificate issuance/renewal, and verify client-to-edge and edge-to-origin independently.
8. **Prepare recovery before release:** create backups, write rollback and blank-state restoration procedures, and actually exercise them.
9. **Validate data before cutover:** check schema compatibility, counts or checksums, application compatibility, and the rollback path before accepting production writes. If the new system will receive writes, decide in advance whether dual-write, reverse replication, or fail-forward is required; a blind rollback may lose new data. The [AWS database-cutover guide](https://docs.aws.amazon.com/prescriptive-guidance/latest/strategy-database-migration/cut-over.html) is one provider example of validating before redirecting applications.
10. **Establish observability before traffic:** verify structured logs, critical metrics, external probes, backup status, alert delivery, dashboards, and a named responder. Operational readiness requires both health checks and a tested notification path.
11. **Release to limited traffic:** run business smoke tests and continue data-consistency checks after cutover. Increase traffic gradually with explicit stop, rollback, or fail-forward conditions.
12. **Hand over an operations runbook:** preserve owners, dashboards, alerts, common incidents, scaling, patching, certificates, backup restoration, and service retirement procedures.

For a small personal project, one Markdown page and one configuration repository can hold this information. Acceptance means using them to rebuild from an empty environment, roll back, and restore.

## Troubleshooting: Follow the Request Path from Outside In

First capture one reproducible sample: time including timezone, client network, URL, request ID, expected result, and actual result. Then inspect layer by layer:

| Order | Question to answer | Common observations |
| --- | --- | --- |
| 1. Client | Are the URL, protocol, time, proxy, and local network correct? | Compare another network/client |
| 2. DNS | Do authoritative answers, recursive caches, A/AAAA/CNAME records, and TTL match expectations? | `dig`, `nslookup` |
| 3. Connection and TLS | Can TCP connect; are certificate hostname, chain, expiry, and SNI correct? | `curl -v https://host/`, `openssl s_client -servername host` |
| 4. CDN / edge | Is DNS actually proxied, and did cache, WAF, redirects, or origin rules rewrite the result? | Response headers, edge logs, origin test that preserves Host/SNI |
| 5. Load balancer | Do the listener, route, health check, and backend port agree? | Backend health, access logs |
| 6. Cloud network | Do addresses, routes, NAT, security groups, and ACLs all permit this path? | Flow logs, route table, rule-hit counters |
| 7. Host/container | Does the host firewall allow it, and is a process listening on the expected address and port? | `ss -lntup`, service manager, container state |
| 8. Application and dependencies | Are configuration, secrets, database, object storage, and external APIs healthy? | Structured logs, metrics, traces, dependency health |

When comparing an origin without changing public DNS, `curl --resolve` can direct a hostname to a chosen IP while preserving the URL hostname for HTTP and TLS; the [curl manual](https://curl.se/docs/manpage.html) documents this behavior. Run that test from an authorized diagnostic location and do not expose the origin or disable edge protection merely to troubleshoot; see Cloudflare’s [origin-protection guidance](https://developers.cloudflare.com/fundamentals/security/protect-your-origin-server/) for one provider example. Also remember that `curl -I` sends `HEAD`: a service may reject `HEAD` while accepting a normal `GET`.

Change one variable at a time, and set a clear removal time for any port, rule, or logging level temporarily loosened for diagnosis. Use causal evidence to choose a starting point in the table: an explicit application-layer 4xx/5xx or application trace can justify going directly to layer 8, while a request that never reaches the entry point makes an application restart low-information.

## Keeping This Article from Going Stale Again

The fundamental boundaries in this article come from standards and long-maintained official architecture documentation. The following facts still require a new check for every real decision:

- product existence, region availability, quotas, and SLA prerequisites;
- prices, free tiers, public IPv4, NAT, load balancing, logging, and egress charges;
- supported operating systems, runtimes, API versions, and retirement plans;
- certificate lifetime, issuance/renewal rules, TLS policy, and browser trust chains;
- measured network quality for target users, data residency, and legal requirements.

The principal first-party sources cited in this article include the IETF standards for DNS, SRV, private IPv4, and TLS; the NIST guidance for cloud computing, patching, and contingency recovery; Cloudflare’s mechanism documentation for CDNs and two-leg TLS; the Kubernetes container documentation; the Azure compute selection guide; the AWS implementation documentation for object versions, VPC, and IAM; and the OpenTelemetry definition of observability signals. Provider documentation is used here only to explain a verifiable mechanism, not as an unconditional recommendation of the provider’s products.
