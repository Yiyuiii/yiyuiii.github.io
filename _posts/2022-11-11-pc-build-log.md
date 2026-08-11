---
title: PC Build Log
uid: '202211110000'
author: Yiyu Chen
date: 2022-11-11 00:00:00 +0800
lang: en
permalink: /en/posts/pc-build-log/
translation_key: post-202211110000
translation_url: /posts/装机记录/
translation_source: _posts/2022-11-11-装机记录.md
translation_status: current
source_hash: abc04dfbe47549107a50227d64899805c923ca592e20f3cfbbc54f7106352b26
thumbnail: /assets/posts/202211110000/cover-generated-2026-07-29.webp
article_cover:
  alt: A desktop PC being assembled on a workbench
  caption: 'Cover: AI-generated illustration, not a photograph or factual record of the 2022 build.'
aliases: []
categories:
- PC Building
tags:
- PC Building
from: null
excerpt: Around Singles' Day 2022, my laptop began blue-screening frequently, and its discrete GPU was struggling with my new monitor. I decided to build an R5 5600 + RX 6600 XT desktop and record the component choices, budget, and assembly problems.
description: A complete R5 5600 + RX 6600 XT build record that keeps requirements, component trade-offs, prices, and assembly problems together, showing how a budget became a balanced machine.
revisions:
- date: '2022-11-11'
  note: Initial draft
- date: '2026-07-29'
  note: Added sources; corrected hardware models, costs, and some technical descriptions; retained the 2022 perspective (with ChatGPT assistance)
- date: '2026-07-30'
  note: Corrected two descriptions concerning refresh-rate gains and stress-test junction temperature (with Kimi assistance)
- date: '2026-08-10'
  note: Standardized desktop, monitor, graphics-card, and solid-state-drive terminology; removed an old laptop-GPU suffix that the surviving records cannot verify; and defined stress-test terminology
---

## Why I Wanted to Build a Desktop PC

My frequently used MECHREVO laptop had been in service for more than two years. It had recently started blue-screening from time to time, and its discrete GPU was struggling with the games I played then. The old draft called it a “GTX 1060 Ti.” The surviving records do not establish the exact model, so this revision drops that suffix.

At the same time, staring at the laptop's small screen for long periods had begun to make my eyes uncomfortable, and neither videos nor games felt as enjoyable on it. I am not nearsighted, and I have always felt, subjectively, that I am more sensitive to discomfort from small screens. Singles' Day was a good opportunity to replace it with a larger, higher-refresh-rate display. Higher resolutions and refresh rates, however, both place greater demands on a graphics card. Once I connected the new monitor, the laptop GPU indeed struggled to maintain the gaming experience I wanted under those display conditions.

> **Additional basis | Display comfort**
>
> Screen size alone cannot be equated directly with whether a display “harms the eyes.” The [OSHA ergonomics guide for monitors](https://www.osha.gov/etools/computer-workstations/components/monitors) focuses more on viewing distance, whether text is easy to read, screen height and angle, glare, and uninterrupted usage time; it gives a common comfortable viewing distance of about 50–100 cm. For me, the main value of a larger external monitor is that it keeps text and images readable at an appropriate distance, without requiring me to keep staring at the laptop's small display area.
{: .article-evidence}

Another factor was that, over the previous two months, I had seen large numbers of mining cards enter the secondhand market. Prices had been pushed very low, and it was relatively easy to find inexpensive used cards from individual sellers.

Together, these three reasons led me to spend a few thousand yuan on a desktop PC and improve my everyday experience.

## Selecting and Buying the Components

I listed the requirements first, then selected the monitor, graphics card, processor, and remaining components in dependency order.

### High-Refresh-Rate Monitor

**First, determine the refresh rate.**

Common refresh rates include 60 Hz, 120 Hz, 144 Hz, 180 Hz, and 240 Hz. The higher the refresh rate, the shorter the wait between image updates: 60 Hz, 120 Hz, 144 Hz, and 240 Hz correspond to refresh intervals of about 16.7 ms, 8.3 ms, 6.9 ms, and 4.2 ms. In other words, the reduction is most obvious when the refresh rate first doubles: going from 60 Hz to 120 Hz cuts about 8.3 ms, while going from 120 Hz to 240 Hz cuts only another 4.2 ms. At higher frequencies, the absolute return from the same proportional increase becomes smaller.

After using the 120 Hz display on a Redmi K40 for a year, I found 60 Hz visibly choppy. I therefore set the monitor target at 144 Hz or above.

> **Additional basis | Refresh rate**
>
> A [2019 experiment](https://research.nvidia.com/publication/2019-09_esports-arms-race-latency-and-refresh-rate-competitive-gaming-tasks) published in the *Journal of Vision* compared 60 Hz, 120 Hz, and 240 Hz, observing improved performance at higher refresh rates in specific FPS target-clicking and tracking tasks. It shows that high refresh rates can bring measurable benefits, but the tasks emphasized competitive gaming and some authors were affiliated with NVIDIA. The results cannot be generalized directly into fixed perceptual tiers for everyone.
{: .article-evidence}

**Then, consider the resolution.**

The rough impression I formed at the time from discussions on Zhihu and elsewhere was that high-refresh-rate gaming at 2560×1440 required an RTX 3080-class graphics card. I rarely play AAA titles at maximum quality and cared more about high refresh rates on a limited budget, so I targeted 1920×1080.

> **Additional note | Resolution and performance**
>
> Common resolutions include 1920×1080, 2560×1440, and 3840×2160. For the same image, a 2560×1440 frame contains about 1.78 times as many pixels to process as a 1920×1080 frame; actual frame rate is also affected by the specific game, quality settings, drivers, and rendering technologies. Therefore, “2560×1440 high-refresh gaming requires an RTX 3080” records only my rough component-selection impression at the time and does not establish a universal hardware threshold.
{: .article-evidence}

**Finally, consider the screen size.**

Screen size should be considered together with use case, resolution, viewing distance, and desk depth. I chose 24.5 inches because, on my desk, a screen of that size generally does not require me to turn my head noticeably and still allows a comfortable viewing distance.

For the other requirements, I preferred an IPS panel.

Based on the combination of **1080p + at least 144 Hz + around 24 inches + IPS**, I settled on a new product available at the time:

- **Lenovo Legion Y25-30, Singles' Day price: RMB 1,299**

It is a 24.5-inch, 1920×1080 IPS monitor with a native refresh rate of 240 Hz, overclockable to 280 Hz, and support for AMD FreeSync Premium. Its specifications covered my requirements exactly, so it seemed completely suitable ;)

> **Product specifications | Y25-30**
>
> The dimensions, resolution, panel type, refresh rate, and synchronization technology above come from Lenovo's [official PSREF specifications](https://psref.lenovo.com/syspool/Sys/PDF/datasheet/Legion_Y25-30_datasheet_EN.pdf). The 280 Hz mode is an overclock from 240 Hz, and Lenovo also warns that overclocking may cause display abnormalities; the stable refresh rate therefore requires validation on the specific monitor.
{: .article-evidence}

### Graphics Card

The monitor resolution and target frame rate directly affect GPU selection. I first consulted graphics-card performance rankings and roughly limited the range to NVIDIA's 20 series and AMD RX 6500 or above. Such rankings are useful for quickly comparing broad performance tiers, but whether a card can take advantage of a high refresh rate at 1080p still depends on the game and quality settings.

After that initial screening, I focused on the RX 6600 XT.

> **Basis for the choice | RX 6600 XT**
>
> [AMD officially positions the RX 6600 XT as a high-frame-rate 1080p graphics card](https://www.amd.com/en/products/graphics/desktops/radeon/6000-series/amd-radeon-rx-6600-xt.html). In AMD's examples at maximum quality and 1080p, different games range from around 110 FPS to several hundred FPS. That variation illustrates precisely why “can it fully use a high-refresh display?” must be judged for each game. Vendor testing can inform component selection, but it is not a guarantee that every machine will reproduce the results.
{: .article-evidence}

At the time, large numbers of secondhand mining cards were entering the market. I saw noticeably more NVIDIA mining cards on Xianyu, so I was more inclined to screen newer-production cards from AMD's 6000 series.

> **Historical context | Secondhand mining cards**
>
> Ethereum completed [The Merge on September 15, 2022](https://ethereum.org/roadmap/merge/), moving its mainnet from proof of work to proof of stake, after which GPU mining no longer produced valid blocks. This timing provides context for the “previous two months” described in the article; estimating relative supply in the secondhand market still requires market data. The RX 6600 XT launched in August 2021, and a particular card's production date limits only its physical age; its usage history requires other evidence.
{: .article-evidence}

I then found an **XFX RX 6600 XT Overseas Edition V2 mining card listed at RMB 1,150** on Xianyu. The detailed listing made the offer attractive: the card had been produced in early 2022 and came with the seller's own test and benchmark records. The production date could not establish its actual usage history. Based on the description, test information, and communication with the seller, I thought it was worth trying and ultimately bought it for RMB 1,120.

By the time this article was completed, I had used the graphics card for two weeks. During that time, the seller continued to discuss usage and the card's condition with me. The purchase met my expectations.

I mounted the graphics card horizontally. To reduce the long-term risk of sagging under its own weight, I supported it with two GPU braces costing RMB 37.8 in total.

### Processor (CPU)

At this point, Intel's 13th-generation desktop processors had just launched, with the initial lineup consisting mainly of unlocked K-series models. I could not find a combination in the launch platform that suited my budget at the time.

After reviewing contemporary performance rankings and build configurations, I preferred the value of the AMD options in my price range. The graphics-card brand did not constrain the processor brand; I chose an AMD processor from this budget comparison, so the conclusion applies only to this build.

Choice: **AMD Ryzen 5 5600**

### Motherboard

There were already many contemporary build configurations using the R5 5600 and RX 6600 XT together. Among B550 motherboards, I mainly compared two common models:

- ASUS TUF GAMING B550M-PLUS
- MSI MAG B550M MORTAR

Considering room for later modifications and my storage requirements, I ultimately chose the **ASUS TUF GAMING B550M-PLUS**.

- **R5 5600 tray CPU + ASUS TUF GAMING B550M-PLUS, Singles' Day price: RMB 1,144**

> **Revision note | Motherboard model**
>
> During the 2026 revision, I checked the physical motherboard information and confirmed that the actual purchase was an ASUS TUF GAMING B550M-PLUS. The original text called it an “MSI B550M-PLUS Mortar,” which was a typo. This revision corrects only the public model name and does not disclose the device serial number.
{: .article-evidence}

> **Compatibility basis | CPU and motherboard**
>
> [Intel's official 13th-generation launch material](https://newsroom.intel.com/press-kit/13th-gen-core) shows that the September 2022 initial release consisted of six unlocked desktop processors. [AMD's R5 5600 specifications](https://www.amd.com/en/support/downloads/drivers.html/processors/ryzen/ryzen-5000-series/amd-ryzen-5-5600.html) explicitly list support for the B550 chipset, a default TDP of 65 W, and PCIe 4.0. [ASUS's official specifications](https://www.asus.com/motherboards-components/motherboards/tuf-gaming/tuf-gaming-b550m-plus/techspec/) confirm that the TUF GAMING B550M-PLUS supports Ryzen 5000-series processors, dual-channel DDR4, and two M.2 slots. These points document release timing and compatibility, not any cross-brand performance ranking.
{: .article-evidence}

The boxed R5 5600 includes a Wraith Stealth cooler. I was already planning to buy a different cooler, so the price saved by this tray-CPU bundle was more valuable to me. I chose the tray CPU.

### Memory

The R5 5600 has two memory channels and officially supports up to DDR4-3200; this ASUS motherboard also uses a dual-channel memory architecture. I selected two modules from the same kit to enable dual-channel operation and reduce the compatibility risks of mixing different models. Dual-channel operation increases available memory bandwidth. The performance gain depends on the workload, and a same-kit configuration still requires stability testing.

For capacity, I chose 8 GB×2 for better value. Anyone who frequently runs more memory-intensive applications would have more headroom with 16 GB×2.

Final choice:

- **Crucial 8 GB×2 DDR4-3200 kit, Singles' Day price: RMB 338**

### Solid-State Drive (SSD)

My storage requirements were modest. A 1 TB solid-state drive was enough for the operating system, commonly used applications, and games. Samsung products of the same capacity were more expensive in my comparison at the time, so I chose a Western Digital Blue drive:

- **Western Digital Blue 1 TB M.2 SSD, Singles' Day price: RMB 579**

### Case

After selecting the B550M motherboard, I found the newly released Jonsbo D31 through the earlier D30. Its industrial design matched my preference.

- **Jonsbo D31 without the display panel, Singles' Day price: RMB 249**

After a week of use, I suspected that the graphics-card fans were too close to the bottom panel, restricting intake. With the bottom of the case directly against the desk, a synthetic load test—commonly called a stress test—produced a GPU core temperature of about 64°C and a junction temperature of about 84°C. This single measurement showed that this PC's placement and airflow still had room for adjustment.

### Power Supply

AMD recommends a minimum system power supply of 500 W for the RX 6600 XT; the card itself has a typical board power of 160 W. My 550 W power supply exceeds the capacity recommendation.

For the brand, I mainly compared Super Flower and Seasonic at the time. I ultimately chose:

- **Super Flower Bronze King 550 W, Singles' Day price: RMB 299**

> **Specification basis | Graphics card and power supply**
>
> The 160 W typical board power and 500 W minimum power-supply recommendation both come from the [official AMD RX 6600 XT specifications](https://www.amd.com/en/products/graphics/desktops/radeon/6000-series/amd-radeon-rx-6600-xt.html). This is a minimum recommendation for total system power-supply capacity; it does not mean that rated wattage alone is sufficient. The power-delivery quality, connectors, and aging of a specific model still require separate consideration.
{: .article-evidence}

### Cooling and Fans

Because I bought a tray CPU, I added a separate cooler:

- **Thermalright AS120R SE, Singles' Day price: RMB 79.9**

Case fans should be selected according to the available mounting positions, airflow, and actual temperatures. I installed three:

- **Jonsbo 12020 fans ×3, Singles' Day price: RMB 59.7**

Two are mounted at the top and one at the rear.

### Price

> **Revision note | Total price**
>
> When recalculating the totals in 2026, I found that the original “desktop total” formula had accidentally included the monitor price while still reporting RMB 3,906.4. The desktop and monitor are now calculated separately below.
{: .article-evidence}

Desktop total:

1120 + 1144 + 338 + 579 + 249 + 299 + 79.9 + 59.7 + 37.8 = **RMB 3,906.4**

Including the monitor:

3906.4 + 1299 = **RMB 5,205.4**

## Assembly Process

Assembly order:

Case → power supply → motherboard (CPU + cooler + memory + storage) → cable routing → fans → graphics card → external cables

The internal cable-routing space in the Jonsbo D31 is very tight, making it difficult to fit the large bundle of cables from the Super Flower Bronze King power supply.

For the operating system, I chose Windows 10 because I trusted its game compatibility more at the time. This records a personal decision from 2022; the processor, graphics card, and motherboard in this build all explicitly supported Windows 10 then.

> **Installation basis | M.2 system drive**
>
> [Microsoft's Windows installation documentation](https://learn.microsoft.com/en-us/windows-hardware/manufacture/desktop/windows-setup-installing-using-the-mbr-or-gpt-partition-style) recommends booting installation media in UEFI mode and using a GPT system drive on modern computers. If the installer or boot menu cannot find the system, first check whether the UEFI / Legacy boot mode matches the GPT / MBR partition style; Legacy / CSM is a compatibility path for older devices and partitioning methods.
{: .article-evidence}

The biggest lesson from this build was still case space. Next time I will buy a larger case so that both cooling and cable routing are easier to manage.
