/**
 * ARIA Page Scripts — panel-open, page-aware announcements.
 *
 * When a user opens the ARIA panel on any of the 31 shipping surfaces,
 * ARIA speaks a DISTINCT three-part script instead of the generic
 * greeting:
 *   (a) a 3–5 word page title,
 *   (b) one sentence describing the page's PURPOSE,
 *   (c) one sentence describing WHAT the user can DO on it.
 *
 * All Arabic entries are fully diacritized (Constitution Article — Arabic
 * TTS quality). English is provided verbatim for parity. Missing routes
 * gracefully fall back to `null`, and callers use the standard generic
 * greeting — never silence, never a placeholder.
 *
 * Sources: each script was written from the ACTUAL rendered content of
 * the route (page-narrations.ts, sec-shell titles, KPI/StatCard labels,
 * and page-narrator entries), not from a template.
 */

export interface PageScript {
  readonly titleAr: string;
  readonly titleEn: string;
  readonly purposeAr: string;
  readonly purposeEn: string;
  readonly actionAr: string;
  readonly actionEn: string;
  /** Two concrete usage examples. If absent, examples are synthesized
   *  from `actionAr/En` so every route still speaks Example 1 & Example 2. */
  readonly example1Ar?: string;
  readonly example1En?: string;
  readonly example2Ar?: string;
  readonly example2En?: string;
  /** Optional extended narration appended after examples — used for a
   *  small set of flagship surfaces (e.g. `/hajj`) that require a full,
   *  end-to-end explanation on entry. */
  readonly extendedAr?: string;
  readonly extendedEn?: string;
}

/**
 * Longest, most specific paths come FIRST. The matcher picks the first
 * prefix whose `startsWith()` matches the current pathname.
 */
const SCRIPTS: ReadonlyArray<readonly [string, PageScript]> = [
  // ── SEC sub-surfaces (specific paths first) ──────────────────────────
  [
    "/sec/exec",
    {
      titleAr: "غُرْفَةُ القِيَادَةِ التَّنْفِيذِيَّة",
      titleEn: "Security Executive Room",
      purposeAr:
        "تَعْرِضُ الجَاهِزِيَّةَ التَّشْغِيلِيَّةَ وَمُؤَشِّرَاتِ المَخَاطِرِ وَالسَّلَامَةِ وَالبَلَاغَاتِ وَزَمَنِ الاسْتِجَابَةِ لَحْظِيًّا مِنْ جَدْوَلِ sec_overview.",
      purposeEn:
        "Renders live operational readiness, risk and safety indices, incidents, and MTTR pulled from sec_overview.",
      actionAr:
        "اضْغُطْ أَيَّ بِطَاقَةٍ لِفَتْحِ مَصْدَرِهَا التَّفْصِيلِيِّ أَوِ اطْلُبْ مِنِّي إِحَاطَةً تَنْفِيذِيَّةً بِأَحَدِ المُؤَشِّرَات.",
      actionEn:
        "Tap any tile to drill into its source, or ask me for an executive briefing on any indicator.",
    },
  ],
  [
    "/sec/twin",
    {
      titleAr: "التَّوْأَمُ الرَّقْمِيُّ الأَمْنِيّ",
      titleEn: "Security Digital Twin",
      purposeAr:
        "يَعْرِضُ نَمُوذَجًا هَرَمِيًّا تَفَاعُلِيًّا لِلدَّوَائِرِ وَالمَوَاقِعِ وَالمَبَانِي وَالأُصُولِ الأَمْنِيَّةِ فِي المِنْطَقَةِ الغَرْبِيَّة.",
      purposeEn:
        "An interactive hierarchy of every circle, site, building, and security asset in the Western Region.",
      actionAr:
        "تَنَقَّلْ بَيْنَ العُقَدِ لِرُؤْيَةِ الأَعْدَادِ الحَيَّةِ لِلْأُصُولِ وَحَالَتِهَا التَّشْغِيلِيَّة.",
      actionEn: "Walk the tree to inspect live asset counts and per-node operational status.",
    },
  ],
  [
    "/sec/circles",
    {
      titleAr: "الدَّوَائِرُ التَّشْغِيلِيَّة",
      titleEn: "Operational Circles",
      purposeAr:
        "تُلَخِّصُ إِجْمَالِيَّ الدَّوَائِرِ وَالمَوَاقِعِ وَالمُوَظَّفِينَ مَعَ بِطَاقَاتٍ تَعْرِضُ المُدِيرَ وَالإِحْدَاثِيَّاتِ لِكُلِّ دَائِرَة.",
      purposeEn:
        "Totals for circles, sites, and headcount, with per-circle cards showing manager and coordinates.",
      actionAr:
        "اضْغُطْ إِحْدَاثِيَّاتِ أَيِّ دَائِرَةٍ لِفَتْحِهَا عَلَى الخَرِيطَةِ التَّنْفِيذِيَّة.",
      actionEn: "Tap a circle's coordinates to open it on the executive map.",
    },
  ],
  [
    "/sec/sections",
    {
      titleAr: "الأَقْسَامُ الأَمْنِيَّة",
      titleEn: "Security Sections",
      purposeAr:
        "تَعْرِضُ هَيْكَلَ الأَقْسَامِ الأَمْنِيَّةِ مَعَ رَئِيسِ كُلِّ قِسْمٍ وَعَدَدِ مُوَظَّفِيهِ وَإِسْنَادِ المَسْؤُولِيَّات.",
      purposeEn:
        "The security division structure — each section, its head, headcount, and responsibility mapping.",
      actionAr: "افْتَحْ أَيَّ قِسْمٍ لِرُؤْيَةِ أَدْوَارِهِ وَأَوَامِرِ عَمَلِهِ المَفْتُوحَة.",
      actionEn: "Open a section to see its roles and open work orders.",
    },
  ],
  [
    "/sec/projects",
    {
      titleAr: "المَشَارِيعُ الأَمْنِيَّة",
      titleEn: "Security Projects",
      purposeAr:
        "تُتَابِعُ المُبَادَرَاتِ الأَمْنِيَّةَ الجَارِيَةَ وَمَرَاحِلَهَا وَالمِيزَانِيَّةَ المَرْصُودَةَ لَهَا.",
      purposeEn: "Tracks in-flight security initiatives, their phases, and allocated budget.",
      actionAr:
        "افْتَحْ أَيَّ مَشْرُوعٍ لِمُرَاجَعَةِ المَعَالِمِ وَالمَهَامِّ وَنِسْبَةِ التَّقَدُّم.",
      actionEn: "Open a project to review milestones, tasks, and completion ratio.",
    },
  ],
  [
    "/sec/maintenance",
    {
      titleAr: "الصِّيَانَةُ وَأَوَامِرُ العَمَل",
      titleEn: "Maintenance & Work Orders",
      purposeAr:
        "تَعْرِضُ إِجْمَالِيَّ أَوَامِرِ العَمَلِ وَالمَفْتُوحَةَ وَالمُتَأَخِّرَةَ مَعَ نَوْعِهَا وَقَائِيَّةً أَوْ تَصْحِيحِيَّة.",
      purposeEn: "Total, open, and overdue work orders with preventive vs corrective typing.",
      actionAr:
        "أَنْشِئْ أَمْرَ عَمَلٍ جَدِيدًا أَوْ فَلْتِرِ الجَدْوَلَ بِحَسَبِ الحَالَةِ وَالنَّوْع.",
      actionEn: "Create a new work order or filter the table by type and status.",
    },
  ],
  [
    "/sec/incidents",
    {
      titleAr: "الحَوَادِثُ الأَمْنِيَّة",
      titleEn: "Security Incidents",
      purposeAr:
        "تَعْرِضُ الحَوَادِثَ المَفْتُوحَةَ وَأَوْلَوِيَّاتَهَا وَالفِرَقَ المُكَلَّفَةَ لَحْظِيًّا مِنْ جَدْوَلِ sec_incidents.",
      purposeEn:
        "Live open incidents with priority, assigned teams, and timeline pulled from sec_incidents.",
      actionAr:
        "فَلْتِرْ بِحَسَبِ الشِّدَّةِ أَوِ المَوْقِعِ أَوِ اطْلُبْ مِنِّي فَتْحَ حَادِثَةٍ حَرِجَة.",
      actionEn: "Filter by severity or site, or ask me to open a specific critical incident.",
    },
  ],
  [
    "/sec/patrols",
    {
      titleAr: "الدَّوْرِيَّاتُ الأَمْنِيَّة",
      titleEn: "Security Patrols",
      purposeAr:
        "تَتَبُّعٌ لَحْظِيٌّ لِمَسَارَاتِ الدَّوْرِيَّاتِ وَنِقَاطِ التَّفْتِيشِ وَنِسْبَةِ الالْتِزَامِ مُقَابِلَ الجَدْوَل.",
      purposeEn: "Live tracking of patrol routes, checkpoints, and compliance vs schedule.",
      actionAr: "افْحَصْ أَيَّ انْحِرَافٍ عَنْ نُقْطَةِ تَفْتِيشٍ أَوْ أَعِدْ تَعْيِينَ فِرْقَة.",
      actionEn: "Inspect any checkpoint deviation or re-assign a patrol team.",
    },
  ],
  [
    "/sec/access",
    {
      titleAr: "التَّحَكُّمُ بِالدُّخُول",
      titleEn: "Access Control",
      purposeAr:
        "نَظْرَةٌ مُوَحَّدَةٌ عَلَى الزُّوَّارِ وَالمَرْكَبَاتِ وَالمُقَاوِلِينَ وَحَالَةِ البَوَّابَاتِ فِي المَوْقِع.",
      purposeEn:
        "A unified view of visitors, vehicles, contractors, and every gate's current state.",
      actionAr:
        "افْتَحْ أَوْ أَغْلِقْ بَوَّابَةً أَوِ اضْغُطْ أَيَّ بِطَاقَةٍ لِلتَّعَمُّقِ فِي مَصْدَرِهَا.",
      actionEn: "Open or close a gate, or drill into any stat card's source.",
    },
  ],
  [
    "/sec/visitors",
    {
      titleAr: "إِدَارَةُ الزُّوَّار",
      titleEn: "Visitor Management",
      purposeAr:
        "سِجِلُّ الزُّوَّارِ المُسَجَّلِينَ وَمَنْ بِالدَّاخِلِ الآنَ وَالمُتَوَقَّعُ قُدُومُهُمْ مَعَ رَبْطٍ لِلتَّصَارِيح.",
      purposeEn:
        "Registered visitor log with who is on-site now, expected arrivals, and permit linkage.",
      actionAr:
        "سَجِّلْ دُخُولَ زَائِرٍ أَوْ خُرُوجَهُ أَوْ أَضِفْ زَائِرًا جَدِيدًا مَعَ صُورَةٍ وَتَصْرِيح.",
      actionEn: "Check a visitor in or out, or register a new visitor with photo and permit.",
    },
  ],
  [
    "/sec/contractors",
    {
      titleAr: "إِدَارَةُ المُقَاوِلِين",
      titleEn: "Contractor Management",
      purposeAr:
        "المُقَاوِلُونَ النَّشِطُونَ، وَعُقُودُ التَّأْمِينِ المُنْتَهِيَةُ قَرِيبًا، وَالمَوْقُوفُونَ عَنِ العَمَل.",
      purposeEn:
        "Active contractors, contracts and insurance expiring soon, and suspended parties.",
      actionAr: "حَدِّثْ حَالَةَ مُقَاوِلٍ أَوْ رَاجِعْ وَثَائِقَهُ قَبْلَ إِصْدَارِ تَصْرِيح.",
      actionEn: "Update a contractor's status or review their documents before issuing a permit.",
    },
  ],
  [
    "/sec/vehicles",
    {
      titleAr: "إِدَارَةُ المَرْكَبَات",
      titleEn: "Vehicle Management",
      purposeAr:
        "سِجِلُّ المَرْكَبَاتِ (سَيَّارَات، شَاحِنَات، صَهَارِيج، حَافِلَات) مَعَ حَالَةِ الدُّخُولِ وَالخُرُوج.",
      purposeEn: "Vehicle registry (cars, trucks, tankers, buses) with entry and exit state.",
      actionAr: "سَجِّلْ دُخُولَ مَرْكَبَةٍ أَوْ رَبْطَهَا بِتَصْرِيحٍ أَوْ حَظْرَ لَوْحَة.",
      actionEn: "Log a vehicle entry, link it to a permit, or blacklist a plate.",
    },
  ],
  [
    "/sec/permits",
    {
      titleAr: "تَصَارِيحُ العَمَل",
      titleEn: "Work Permits",
      purposeAr:
        "التَّصَارِيحُ السَّارِيَةُ وَالمُعَلَّقَةُ وَالمُنْتَهِيَةُ مَعَ عَلَامَاتِ المَخَاطِرِ لِلْأَعْمَالِ الحَارَّة.",
      purposeEn: "Active, pending, and expired permits flagged for hot- and restricted-work risk.",
      actionAr:
        "اعْتَمِدْ أَوِ ارْفُضْ تَصْرِيحًا بَعْدَ مُرَاجَعَةِ فُحُوصَاتِ المُقَاوِلِ وَالتَّأْمِينِ وَالتَّدْرِيب.",
      actionEn:
        "Approve or reject a permit after reviewing contractor, insurance, and training checks.",
    },
  ],
  [
    "/sec/emergency",
    {
      titleAr: "غُرْفَةُ الطَّوَارِئ",
      titleEn: "Emergency Response Room",
      purposeAr:
        "بُرُوتُوكُولَاتُ الاسْتِجَابَةِ وَالفِرَقُ الجَاهِزَةُ وَمَسَارَاتُ الإِخْلَاءِ لِأَيِّ حَادِثَةٍ حَرِجَة.",
      purposeEn:
        "Response protocols, on-call teams, and evacuation routes for any critical incident.",
      actionAr:
        "فَعِّلْ تَسَلْسُلَ IS-٠٠٧ أَوْ أَخْطِرِ الجِهَاتِ المَعْنِيَّةَ مِنْ هُنَا مُبَاشَرَة.",
      actionEn: "Trigger the IS-007 sequence or notify the concerned authorities from here.",
    },
  ],
  [
    "/sec/cctv",
    {
      titleAr: "كَامِيرَاتُ المُرَاقَبَة",
      titleEn: "CCTV Operations",
      purposeAr:
        "الكَامِيرَاتُ النَّشِطَةُ وَحَالَتُهَا الفَنِّيَّةُ وَأَيُّ تَنْبِيهَاتٍ مَرْئِيَّةٍ لَحْظِيَّة.",
      purposeEn: "Active cameras, technical status, and any live visual alerts.",
      actionAr:
        "افْتَحْ تَدَفُّقَ كَامِيرَا أَوِ اقْفِزْ إِلَى الحَادِثَةِ المَرْبُوطَةِ بِأَيِّ تَنْبِيه.",
      actionEn: "Open a camera stream or jump to the incident linked to any alert.",
    },
  ],
  [
    "/sec/safety",
    {
      titleAr: "لَوْحَةُ السَّلَامَة",
      titleEn: "Safety Dashboard",
      purposeAr:
        "مُؤَشِّرُ السَّلَامَةِ وَبَلَاغَاتُ الحَوَادِثِ وَاتِّجَاهَاتُ ٧ وَ٣٠ وَ٩٠ يَوْمًا.",
      purposeEn: "Safety index, reported incidents, and 7/30/90-day trend windows.",
      actionAr:
        "افْحَصْ سَبَبَ أَيِّ انْخِفَاضٍ فِي المُؤَشِّرِ أَوْ سَجِّلْ بَلَاغَ سَلَامَةٍ جَدِيدًا.",
      actionEn: "Investigate any dip in the index or log a new safety observation.",
    },
  ],
  [
    "/sec/risks",
    {
      titleAr: "سِجِلُّ المَخَاطِر",
      titleEn: "Risk Register",
      purposeAr:
        "مَصْفُوفَةُ الاحْتِمَالِ وَالأَثَرِ ٥×٥ مَعَ مَالِكٍ وَخُطَّةِ تَخْفِيفٍ لِكُلِّ خَطَر.",
      purposeEn: "A 5×5 likelihood-vs-impact matrix with owner and mitigation plan per risk.",
      actionAr:
        "حَدِّثْ حَالَةَ خَطَرٍ أَوْ عَيِّنْ مَالِكًا أَوْ أَصْدِرْ خُطَّةَ تَخْفِيفٍ جَدِيدَة.",
      actionEn: "Update a risk, assign an owner, or issue a fresh mitigation plan.",
    },
  ],
  [
    "/sec/reports",
    {
      titleAr: "التَّقَارِيرُ التَّنْفِيذِيَّةُ الأَمْنِيَّة",
      titleEn: "Security Executive Reports",
      purposeAr:
        "تَقَارِيرُ يَوْمِيَّةٌ وَأُسْبُوعِيَّةٌ وَشَهْرِيَّةٌ قَابِلَةٌ لِلتَّصْدِيرِ مَبْنِيَّةٌ عَلَى بَيَانَاتٍ حَيَّة.",
      purposeEn: "Daily, weekly, and monthly exportable reports built on live data.",
      actionAr: "صَدِّرْ تَقْرِيرًا بِـ PDF أَوْ Excel أَوْ جَدْوِلْ تَسْلِيمَهُ عَبْرَ Outlook.",
      actionEn: "Export a report as PDF or Excel, or schedule Outlook delivery.",
    },
  ],
  [
    "/sec/assets",
    {
      titleAr: "الأُصُولُ الأَمْنِيَّة",
      titleEn: "Security Assets",
      purposeAr:
        "الحَالَةُ التَّشْغِيلِيَّةُ لِكُلِّ أَصْلٍ، وَالصِّيَانَةُ المُسْتَحَقَّةُ، وَالأَصُولُ المُتَعَطِّلَة.",
      purposeEn: "The operational status of every asset, due maintenance, and offline units.",
      actionAr:
        "افْتَحْ سِجِلَّ أَصْلٍ لِرُؤْيَةِ آخِرِ فَحْصٍ أَوْ أَصْدِرْ أَمْرَ عَمَلٍ فَوْرِيًّا.",
      actionEn: "Open an asset record to inspect its last check or issue an immediate work order.",
    },
  ],
  [
    "/sec/facilities",
    {
      titleAr: "المُنْشَآتُ وَالمَبَانِي",
      titleEn: "Facilities & Buildings",
      purposeAr:
        "شَجَرَةُ المَوَاقِعِ وَالمَبَانِي وَالأَقْسَامِ مَعَ جَاهِزِيَّةِ كُلِّ مِرْفَقٍ لَحْظِيًّا.",
      purposeEn: "The site–building–section tree with live readiness per facility.",
      actionAr:
        "افْتَحْ أَيَّ مَبْنًى لِفَحْصِ CCTV وَالدُّخُولِ وَالدَّوْرِيَّاتِ وَأَوَامِرِ العَمَلِ فِيه.",
      actionEn: "Open a building to inspect its CCTV, access, patrols, and open work orders.",
    },
  ],
  [
    "/sec/timeline",
    {
      titleAr: "الخَطُّ الزَّمَنِيُّ الأَمْنِيّ",
      titleEn: "Security Timeline",
      purposeAr:
        "تَسَلْسُلٌ لَحْظَةً بِلَحْظَةٍ لِأَحْدَاثِ enterprise_events وَ sec_activity وَ CCTV عَلَى مِحْوَرٍ وَاحِد.",
      purposeEn:
        "Moment-by-moment enterprise_events, sec_activity, and CCTV events merged on a single axis.",
      actionAr:
        "فَلْتِرْ بِحَسَبِ المَصْدَرِ أَوِ الشِّدَّةِ أَوْ صَدِّرْ مَقْطَعًا كَدَلِيلٍ لِلْحَادِثَة.",
      actionEn: "Filter by source or severity, or export a clip as incident evidence.",
    },
  ],
  [
    "/sec/ai",
    {
      titleAr: "طَبَقَةُ الذَّكَاءِ الأَمْنِيّ",
      titleEn: "Security AI Layer",
      purposeAr:
        "نَمَاذِجُ الاكْتِشَافِ وَتَصْنِيفِ الأَحْدَاثِ وَتَوْصِيَاتٌ اسْتِبَاقِيَّةٌ بِدَرَجَةِ ثِقَة.",
      purposeEn:
        "Detection models, event classification, and confidence-scored proactive recommendations.",
      actionAr:
        "رَاجِعْ تَوْصِيَاتِي وَاعْتَمِدْهَا؛ لَا يُنَفَّذُ أَيُّ إِجْرَاءٍ تِلْقَائِيًّا بِدُونِ مُوَافَقَتِك.",
      actionEn:
        "Review my recommendations and approve — nothing auto-executes without your sign-off.",
    },
  ],
  [
    "/sec/integrations",
    {
      titleAr: "تَكَامُلَاتُ الأَمْن",
      titleEn: "Security Integrations",
      purposeAr:
        "الأَنْظِمَةُ المَرْبُوطَةُ وَحَالَةُ كُلِّ تَكَامُلٍ وَمُعَدَّلُ أَخْطَاءِ المُزَامَنَة.",
      purposeEn: "Connected systems, per-integration status, and sync error rate.",
      actionAr: "أَعِدْ تَشْغِيلَ تَكَامُلٍ مُتَعَطِّلٍ أَوْ رَاجِعْ سِجِلَّ آخِرِ مُزَامَنَة.",
      actionEn: "Restart a failing integration or inspect its last sync log.",
    },
  ],
  [
    "/sec/shifts",
    {
      titleAr: "جَدْوَلُ المُنَاوَبَات",
      titleEn: "Shifts Schedule",
      purposeAr:
        "جَدْوَلَةُ الفِرَقِ وَتَغْطِيَتُهَا وَتَنَاوُبُهَا اللَّحْظِيُّ مَعَ مُطَابَقَةِ الحُضُور.",
      purposeEn: "Team scheduling, coverage, and live rotation reconciled against attendance.",
      actionAr:
        "أَصْلِحْ فَجْوَةَ تَغْطِيَةٍ أَوِ اقْبَلِ الاقْتِرَاحَ الآلِيَّ لِمُنَاوِبٍ بَدِيل.",
      actionEn: "Close a coverage gap or accept the auto-suggested substitute.",
    },
  ],
  [
    "/sec/knowledge",
    {
      titleAr: "مُسْتَوْدَعُ المَعْرِفَةِ الصِّنَاعِيّ",
      titleEn: "Industrial Knowledge Repository",
      purposeAr:
        "سِيَاسَاتٌ وَإِجْرَاءَاتٌ وَنَمَاذِجُ وَقَوَائِمُ تَحَقُّقٍ لِلْأَمْنِ الصِّنَاعِيِّ ثُنَائِيَّةُ اللُّغَة.",
      purposeEn: "Bilingual industrial-security policies, procedures, forms, and checklists.",
      actionAr:
        "ابْحَثْ فِي المُسْتَوْدَعِ أَوْ أَجْرِ زَرْعًا تَأْسِيسِيًّا لِلْمَقَالَاتِ المَرْجِعِيَّة.",
      actionEn: "Search the repository or run a foundational seed of reference articles.",
    },
  ],
  [
    "/sec/kpi",
    {
      titleAr: "مُؤَشِّرَاتُ الأَدَاءِ الأَمْنِيَّة",
      titleEn: "Security KPIs",
      purposeAr:
        "أَرْقَامٌ لَحْظِيَّةٌ مِنْ جَدَاوِلِ sec_* دُونَ تَخْزِينٍ وَسِيطٍ، مَعَ سَقْفٍ أَحْمَرَ وَأَصْفَرَ وَأَخْضَر.",
      purposeEn:
        "Live figures straight from sec_* with no intermediate store, plus red/yellow/green thresholds.",
      actionAr:
        "افْتَحْ أَيَّ مُؤَشِّرٍ لِرُؤْيَةِ مَصْدَرِهِ وَاسْتِعْلَامِهِ وَنَافِذَتِهِ الزَّمَنِيَّة.",
      actionEn: "Open any KPI to inspect its source, query, and measurement window.",
    },
  ],
  // ── SEC root (must come AFTER every /sec/* path) ─────────────────────
  [
    "/sec",
    {
      titleAr: "غُرْفَةُ العَمَلِيَّاتِ الأَمْنِيَّة",
      titleEn: "Security Operations Room",
      purposeAr:
        "نَظْرَةٌ فَوْرِيَّةٌ عَلَى البَلَاغَاتِ وَالدَّوْرِيَّاتِ وَالزُّوَّارِ وَالتَّصَارِيحِ وَالكَامِيرَاتِ وَالأُصُول.",
      purposeEn:
        "An immediate cross-view of incidents, patrols, visitors, permits, cameras, and assets.",
      actionAr:
        "اضْغُطْ أَيَّ لَوْحَةٍ لِفَتْحِ وَحْدَتِهَا التَّفْصِيلِيَّةِ أَوِ اطْلُبْ مِنِّي مُلَخَّصَ اليَوْم.",
      actionEn: "Tap any panel to open its detailed module, or ask me for today's summary.",
    },
  ],
  // ── Top-level surfaces ───────────────────────────────────────────────
  [
    "/os",
    {
      titleAr: "نِظَامُ التَّشْغِيلِ المُؤَسَّسِيّ",
      titleEn: "Enterprise Operating System",
      purposeAr:
        "لَوْحَةُ القِيَادَةِ السِّيَادِيَّةُ لِلْمُؤَسَّسَةِ تَعْرِضُ نَبْضَهَا الحَيَّ عَبْرَ سِتَّةِ مُؤَشِّرَاتٍ تَنْفِيذِيَّة.",
      purposeEn: "The sovereign command deck — live enterprise pulse across six executive KPIs.",
      actionAr:
        "افْتَحْ أَيَّ بِطَاقَةٍ لِلتَّعَمُّقِ فِي مَصْدَرِهَا أَوِ ادْخُلْ إِلَى وِحْدَاتِ التَّشْغِيل.",
      actionEn: "Drill into any tile's source, or enter the runtime modules from here.",
    },
  ],
  [
    "/operations",
    {
      titleAr: "طَبَقَةُ تَصَوُّرِ العَمَلِيَّات",
      titleEn: "Operations Visualization Layer",
      purposeAr:
        "حَالَةُ التَّشْغِيلِ الحَيَّةُ لِلْوُكَلَاءِ وَسَيْرِ العَمَلِ وَتَدَفُّقِ الأَحْدَاثِ المُؤَسَّسِيَّة.",
      purposeEn: "Live runtime state of agents, workflows, and the enterprise event stream.",
      actionAr: "افْحَصْ أَيَّ تَشْغِيلٍ جَارٍ أَوِ اقْفِزْ إِلَى الحَادِثَةِ المَرْبُوطَةِ بِهِ.",
      actionEn: "Inspect any running job or jump to the incident it's linked to.",
    },
  ],
  [
    "/settings",
    {
      titleAr: "الإِعْدَادَاتُ الشَّخْصِيَّة",
      titleEn: "Personal Settings",
      purposeAr:
        "إِدَارَةُ المَلَفِّ الشَّخْصِيِّ وَالمَظْهَرِ وَاللُّغَةِ وَالإِشْعَارَاتِ وَتَكَامُلِ Microsoft Identity.",
      purposeEn:
        "Manage profile, appearance, language, notifications, and Microsoft Identity integration.",
      actionAr: "بَدِّلْ اللُّغَةَ أَوِ اضْبُطْ Tenant وَClient ID لِتَكَامُلِ Microsoft Graph.",
      actionEn: "Switch language or configure Tenant/Client ID for Microsoft Graph.",
    },
  ],
  [
    "/admin",
    {
      titleAr: "لَوْحَةُ الإِدَارَة",
      titleEn: "Admin Console",
      purposeAr:
        "إِدَارَةُ المُسْتَخْدِمِينَ وَالأَدْوَارِ وَضَوَابِطِ النِّظَامِ وَسِجِلَّاتِ المُحَادَثَاتِ وَالمَهَامّ.",
      purposeEn: "Manage users, roles, system controls, threads, messages, and tasks.",
      actionAr:
        "افْتَحْ وِحْدَةَ المُسْتَخْدِمِينَ لِتَعْيِينِ صَلَاحِيَّةٍ أَوْ تَدْقِيقِ سِجِلٍّ.",
      actionEn: "Open the users module to grant a role or audit a log.",
    },
  ],
  // ── Flagship: Hajj platform (full end-to-end explanation on entry) ───
  [
    "/hajj",
    {
      titleAr: "مِنَصَّةُ الحَجّ التَّنْفِيذِيَّة",
      titleEn: "Hajj Executive Platform",
      purposeAr:
        "مَرْكَزُ القِيَادَةِ الحَيُّ لِمَوْسِمِ الحَجّ — يَرْبِطُ خَرَائِطَ الحُشُودِ وَمَسَارَاتِ الحَافِلَاتِ وَحَالَةَ المَخَيَّمَاتِ وَالخِدْمَاتِ الطِّبِّيَّةِ وَبَلَاغَاتِ الأَمْنِ وَمُؤَشِّرَاتِ الجَاهِزِيَّةِ فِي مَشْهَدٍ تَنْفِيذِيٍّ وَاحِد.",
      purposeEn:
        "The live command center for the Hajj season — unifying crowd heatmaps, bus routes, camp status, medical services, security incidents, and readiness indices in one executive view.",
      actionAr:
        "تَنَقَّلْ بَيْنَ الأَقْسَامِ لِمُتَابَعَةِ الحُشُودِ وَالحَافِلَاتِ وَالمَخَيَّمَاتِ وَالطَّوَارِئِ، أَوِ اطْلُبْ مِنِّي إِحَاطَةً تَنْفِيذِيَّةً فَوْرِيَّة.",
      actionEn:
        "Navigate the sections to track crowds, buses, camps, and emergencies, or ask me for an instant executive briefing.",
      example1Ar: "قُلْ لِي: أَظْهِرْ أَعْلَى ثَلَاثِ مَنَاطِقَ ازْدِحَامًا الآن",
      example1En: "Say: show the top three most crowded zones right now",
      example2Ar: "قُلْ لِي: مَا حَالَةُ الحَافِلَاتِ المُتَأَخِّرَةِ عَنِ الجَدْوَل؟",
      example2En: "Say: what is the status of buses running behind schedule?",
      extendedAr:
        "خِلَالَ زِيَارَتِكَ هُنَا سَأُنَبِّهُكَ تِلْقَائِيًّا عِنْدَ تَجَاوُزِ أَيِّ مُؤَشِّرٍ حَرِجٍ، وَأَعْرِضُ عَلَيْكَ التَّوْصِيَاتِ التَّنْفِيذِيَّةَ الأَوْلَى بِالتَّنْفِيذِ، وَأَرْبِطُ كُلَّ بَلَاغٍ بِمَصْدَرِهِ فِي قَاعِدَةِ البَيَانَاتِ الحَيَّة.",
      extendedEn:
        "While you are here I will auto-alert you when any critical KPI is breached, surface the top executive recommendations, and link every incident back to its live data source.",
    },
  ],
];

export type SpeechLocale = "ar" | "en";

/**
 * Match the current pathname to its page script. Longer, more specific
 * paths win because the table is ordered specific-first.
 * Handles both public paths (`/sec/incidents`) and internal layout paths
 * (`/_authenticated/sec.incidents`) transparently.
 */
export function pageScriptFor(pathname: string): PageScript | null {
  const p = normalizePath(pathname);
  for (const [prefix, script] of SCRIPTS) {
    if (p === prefix || p.startsWith(prefix + "/") || p.startsWith(prefix)) {
      return script;
    }
  }
  return null;
}

/** Public URL form. The visible URL is what the user knows the page by. */
function normalizePath(pathname: string): string {
  // Strip the `_authenticated` layout prefix; convert dot-notation route
  // ids (`sec.incidents`) into slash paths (`sec/incidents`) so both
  // shapes match the same script.
  let p = pathname;
  p = p.replace(/^\/_authenticated/, "");
  // Convert only within the /sec segment so we don't accidentally rewrite
  // legitimate dotted filenames elsewhere.
  p = p.replace(/^\/sec\./, "/sec/");
  return p || "/";
}

/**
 * Render a page script as the actual sentence ARIA speaks/displays.
 * Returns `null` when the route has no dedicated script yet — the caller
 * is expected to fall back to the generic greeting.
 */
export function speakablePageScript(pathname: string, locale: SpeechLocale): string | null {
  const s = pageScriptFor(pathname);
  if (!s) return genericSpeakable(pathname, locale);
  const ex1Ar = s.example1Ar ?? deriveExampleAr(s.actionAr, 1);
  const ex2Ar = s.example2Ar ?? deriveExampleAr(s.actionAr, 2);
  const ex1En = s.example1En ?? deriveExampleEn(s.actionEn, 1);
  const ex2En = s.example2En ?? deriveExampleEn(s.actionEn, 2);
  if (locale === "en") {
    const base = `You are in ${s.titleEn}. ${s.purposeEn} ${s.actionEn} Example one: ${ex1En}. Example two: ${ex2En}.`;
    return s.extendedEn ? `${base} ${s.extendedEn}` : base;
  }
  const base = `أَنْتَ فِي ${s.titleAr}. ${s.purposeAr} ${s.actionAr} المِثَالُ الأَوَّل: ${ex1Ar}. المِثَالُ الثَّانِي: ${ex2Ar}.`;
  return s.extendedAr ? `${base} ${s.extendedAr}` : base;
}

/**
 * Return the raw parts so a UI surface can render the title, purpose,
 * and action separately (e.g. as an executive intro card in the panel).
 */
export function pageScriptParts(pathname: string): PageScript | null {
  return pageScriptFor(pathname);
}

// ── Fallbacks ─────────────────────────────────────────────────────────
function deriveExampleAr(action: string, n: 1 | 2): string {
  const trimmed = action.replace(/[.،]+$/g, "").trim();
  return n === 1
    ? `جَرِّبْ الآن — ${trimmed}`
    : `اطْلُبْ مِنِّي مُلَخَّصًا تَنْفِيذِيًّا عَنْ هَذِهِ النَّافِذَة`;
}
function deriveExampleEn(action: string, n: 1 | 2): string {
  const trimmed = action.replace(/[.]+$/g, "").trim();
  return n === 1 ? `Try now — ${trimmed}` : `Ask me for an executive brief on this window`;
}

function humanizeSegment(seg: string): { ar: string; en: string } {
  const clean = seg.replace(/[-_.]+/g, " ").trim();
  return { ar: clean, en: clean.replace(/\b\w/g, (c) => c.toUpperCase()) };
}

function genericSpeakable(pathname: string, locale: SpeechLocale): string {
  const p = normalizePath(pathname);
  const last = p.split("/").filter(Boolean).pop() ?? "home";
  const { ar, en } = humanizeSegment(last);
  if (locale === "en") {
    return `You are on ${en}. This surface lets you review live data for ${en}. Example one: open a card to inspect details. Example two: ask me for a quick executive brief.`;
  }
  return `أَنْتَ فِي نَافِذَةِ ${ar}. تَعْرِضُ هَذِهِ النَّافِذَةُ البَيَانَاتِ الحَيَّةَ الخَاصَّةَ بِـ ${ar}. المِثَالُ الأَوَّل: افْتَحْ أَيَّ بِطَاقَةٍ لِمُرَاجَعَةِ تَفَاصِيلِهَا. المِثَالُ الثَّانِي: اطْلُبْ مِنِّي إِحَاطَةً تَنْفِيذِيَّةً مُوجَزَة.`;
}
