--
-- PostgreSQL database dump
--

-- Dumped from database version 17.2
-- Dumped by pg_dump version 17.2

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: Promotions; Type: TABLE; Schema: public; Owner: oac_softwares
--

CREATE TABLE public."Promotions" (
    id integer NOT NULL,
    "userId" integer NOT NULL,
    "oldDesignationId" integer NOT NULL,
    "designationId" integer NOT NULL,
    "previousSalary" numeric(12,2) NOT NULL,
    "newSalary" numeric(12,2) NOT NULL,
    "effectiveDate" date NOT NULL,
    "promotionReason" text,
    "promotionDate" timestamp with time zone,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    "deletedAt" timestamp with time zone
);


ALTER TABLE public."Promotions" OWNER TO oac_softwares;

--
-- Name: Promotions_id_seq; Type: SEQUENCE; Schema: public; Owner: oac_softwares
--

CREATE SEQUENCE public."Promotions_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Promotions_id_seq" OWNER TO oac_softwares;

--
-- Name: Promotions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: oac_softwares
--

ALTER SEQUENCE public."Promotions_id_seq" OWNED BY public."Promotions".id;


--
-- Name: Team; Type: TABLE; Schema: public; Owner: oac_softwares
--

CREATE TABLE public."Team" (
    id integer NOT NULL,
    "teamName" character varying(255) NOT NULL,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL
);


ALTER TABLE public."Team" OWNER TO oac_softwares;

--
-- Name: TeamLeader; Type: TABLE; Schema: public; Owner: oac_softwares
--

CREATE TABLE public."TeamLeader" (
    id integer NOT NULL,
    "teamId" integer,
    "userId" integer,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL
);


ALTER TABLE public."TeamLeader" OWNER TO oac_softwares;

--
-- Name: TeamLeader_id_seq; Type: SEQUENCE; Schema: public; Owner: oac_softwares
--

CREATE SEQUENCE public."TeamLeader_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."TeamLeader_id_seq" OWNER TO oac_softwares;

--
-- Name: TeamLeader_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: oac_softwares
--

ALTER SEQUENCE public."TeamLeader_id_seq" OWNED BY public."TeamLeader".id;


--
-- Name: TeamMember; Type: TABLE; Schema: public; Owner: oac_softwares
--

CREATE TABLE public."TeamMember" (
    id integer NOT NULL,
    "teamId" integer,
    "userId" integer,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL
);


ALTER TABLE public."TeamMember" OWNER TO oac_softwares;

--
-- Name: TeamMember_id_seq; Type: SEQUENCE; Schema: public; Owner: oac_softwares
--

CREATE SEQUENCE public."TeamMember_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."TeamMember_id_seq" OWNER TO oac_softwares;

--
-- Name: TeamMember_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: oac_softwares
--

ALTER SEQUENCE public."TeamMember_id_seq" OWNED BY public."TeamMember".id;


--
-- Name: Team_id_seq; Type: SEQUENCE; Schema: public; Owner: oac_softwares
--

CREATE SEQUENCE public."Team_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."Team_id_seq" OWNER TO oac_softwares;

--
-- Name: Team_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: oac_softwares
--

ALTER SEQUENCE public."Team_id_seq" OWNED BY public."Team".id;


--
-- Name: designation; Type: TABLE; Schema: public; Owner: oac_softwares
--

CREATE TABLE public.designation (
    id integer NOT NULL,
    "designationName" character varying(255) NOT NULL,
    abbreviation character varying(255) NOT NULL,
    "roleId" integer
);


ALTER TABLE public.designation OWNER TO oac_softwares;

--
-- Name: designation_id_seq; Type: SEQUENCE; Schema: public; Owner: oac_softwares
--

CREATE SEQUENCE public.designation_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.designation_id_seq OWNER TO oac_softwares;

--
-- Name: designation_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: oac_softwares
--

ALTER SEQUENCE public.designation_id_seq OWNED BY public.designation.id;


--
-- Name: leaveType; Type: TABLE; Schema: public; Owner: oac_softwares
--

CREATE TABLE public."leaveType" (
    id integer NOT NULL,
    "leaveTypeName" character varying(255),
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL
);


ALTER TABLE public."leaveType" OWNER TO oac_softwares;

--
-- Name: leaveType_id_seq; Type: SEQUENCE; Schema: public; Owner: oac_softwares
--

CREATE SEQUENCE public."leaveType_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."leaveType_id_seq" OWNER TO oac_softwares;

--
-- Name: leaveType_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: oac_softwares
--

ALTER SEQUENCE public."leaveType_id_seq" OWNED BY public."leaveType".id;


--
-- Name: role; Type: TABLE; Schema: public; Owner: oac_softwares
--

CREATE TABLE public.role (
    id integer NOT NULL,
    "roleName" character varying(255) NOT NULL,
    abbreviation character varying(255) NOT NULL,
    status boolean DEFAULT true,
    department character varying(255)
);


ALTER TABLE public.role OWNER TO oac_softwares;

--
-- Name: role_id_seq; Type: SEQUENCE; Schema: public; Owner: oac_softwares
--

CREATE SEQUENCE public.role_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.role_id_seq OWNER TO oac_softwares;

--
-- Name: role_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: oac_softwares
--

ALTER SEQUENCE public.role_id_seq OWNED BY public.role.id;


--
-- Name: statutoryinfo; Type: TABLE; Schema: public; Owner: oac_softwares
--

CREATE TABLE public.statutoryinfo (
    id integer NOT NULL,
    "userId" integer NOT NULL,
    "adharNo" character varying(255),
    "panNumber" character varying(255),
    "esiNumber" character varying(255),
    "pfNumber" character varying(255),
    "uanNumber" character varying(255),
    "insuranceNumber" character varying(255),
    "passportNumber" character varying(255),
    "passportExpiry" timestamp with time zone
);


ALTER TABLE public.statutoryinfo OWNER TO oac_softwares;

--
-- Name: statutoryinfo_id_seq; Type: SEQUENCE; Schema: public; Owner: oac_softwares
--

CREATE SEQUENCE public.statutoryinfo_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.statutoryinfo_id_seq OWNER TO oac_softwares;

--
-- Name: statutoryinfo_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: oac_softwares
--

ALTER SEQUENCE public.statutoryinfo_id_seq OWNED BY public.statutoryinfo.id;


--
-- Name: user; Type: TABLE; Schema: public; Owner: oac_softwares
--

CREATE TABLE public."user" (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    "empNo" character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    "phoneNumber" character varying(255),
    password character varying(255) NOT NULL,
    "roleId" integer NOT NULL,
    status boolean DEFAULT true NOT NULL,
    "userImage" character varying(255),
    url character varying(255),
    director boolean DEFAULT false NOT NULL,
    "paswordReset" boolean DEFAULT false,
    "isTemporary" boolean DEFAULT true NOT NULL,
    separated boolean DEFAULT false,
    "separationNote" text,
    "separationDate" date,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL
);


ALTER TABLE public."user" OWNER TO oac_softwares;

--
-- Name: userLeave; Type: TABLE; Schema: public; Owner: oac_softwares
--

CREATE TABLE public."userLeave" (
    id integer NOT NULL,
    "userId" integer,
    "leaveTypeId" integer,
    "noOfDays" double precision DEFAULT '0'::double precision,
    "takenLeaves" double precision DEFAULT '0'::double precision,
    "leaveBalance" double precision DEFAULT '0'::double precision,
    year integer,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL
);


ALTER TABLE public."userLeave" OWNER TO oac_softwares;

--
-- Name: userLeave_id_seq; Type: SEQUENCE; Schema: public; Owner: oac_softwares
--

CREATE SEQUENCE public."userLeave_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."userLeave_id_seq" OWNER TO oac_softwares;

--
-- Name: userLeave_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: oac_softwares
--

ALTER SEQUENCE public."userLeave_id_seq" OWNED BY public."userLeave".id;


--
-- Name: userPersonal; Type: TABLE; Schema: public; Owner: oac_softwares
--

CREATE TABLE public."userPersonal" (
    id integer NOT NULL,
    "userId" integer NOT NULL,
    "dateOfJoining" date,
    "confirmationDate" date,
    "bloodGroup" character varying(255),
    "emergencyContactNo" character varying(255),
    "emergencyContactName" character varying(255),
    "emergencyContactRelation" character varying(255),
    "maritalStatus" character varying(255) NOT NULL,
    "dateOfBirth" date,
    gender character varying(255) NOT NULL,
    "parentName" character varying(255),
    "spouseName" character varying(255),
    "referredBy" character varying(255),
    "reportingMangerId" integer,
    "spouseContactNo" character varying(255),
    "parentContactNo" character varying(255),
    "motherName" character varying(255),
    "motherContactNo" character varying(255),
    "temporaryAddress" text,
    "permanentAddress" text,
    qualification character varying(255),
    experience character varying(255),
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL
);


ALTER TABLE public."userPersonal" OWNER TO oac_softwares;

--
-- Name: userPersonal_id_seq; Type: SEQUENCE; Schema: public; Owner: oac_softwares
--

CREATE SEQUENCE public."userPersonal_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."userPersonal_id_seq" OWNER TO oac_softwares;

--
-- Name: userPersonal_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: oac_softwares
--

ALTER SEQUENCE public."userPersonal_id_seq" OWNED BY public."userPersonal".id;


--
-- Name: userPosition; Type: TABLE; Schema: public; Owner: oac_softwares
--

CREATE TABLE public."userPosition" (
    id integer NOT NULL,
    "userId" integer NOT NULL,
    division character varying(255),
    "costCentre" character varying(255),
    grade character varying(255),
    location character varying(255),
    department character varying(255),
    office character varying(255),
    salary character varying(255),
    "probationPeriod" integer,
    "probationNote" character varying(255),
    "officialMailId" character varying(255),
    "projectMailId" character varying(255),
    "designationId" integer,
    "teamId" integer,
    "confirmationDate" date
);


ALTER TABLE public."userPosition" OWNER TO oac_softwares;

--
-- Name: userPosition_id_seq; Type: SEQUENCE; Schema: public; Owner: oac_softwares
--

CREATE SEQUENCE public."userPosition_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public."userPosition_id_seq" OWNER TO oac_softwares;

--
-- Name: userPosition_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: oac_softwares
--

ALTER SEQUENCE public."userPosition_id_seq" OWNED BY public."userPosition".id;


--
-- Name: user_id_seq; Type: SEQUENCE; Schema: public; Owner: oac_softwares
--

CREATE SEQUENCE public.user_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_id_seq OWNER TO oac_softwares;

--
-- Name: user_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: oac_softwares
--

ALTER SEQUENCE public.user_id_seq OWNED BY public."user".id;


--
-- Name: useraccount; Type: TABLE; Schema: public; Owner: oac_softwares
--

CREATE TABLE public.useraccount (
    id integer NOT NULL,
    "userId" integer NOT NULL,
    "bankName" character varying(255) NOT NULL,
    "accountNo" character varying(255) NOT NULL,
    "ifseCode" character varying(255) NOT NULL,
    "paymentFrequency" character varying(255) NOT NULL,
    "modeOfPayment" character varying(255) NOT NULL,
    "branchName" character varying(255)
);


ALTER TABLE public.useraccount OWNER TO oac_softwares;

--
-- Name: useraccount_id_seq; Type: SEQUENCE; Schema: public; Owner: oac_softwares
--

CREATE SEQUENCE public.useraccount_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.useraccount_id_seq OWNER TO oac_softwares;

--
-- Name: useraccount_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: oac_softwares
--

ALTER SEQUENCE public.useraccount_id_seq OWNED BY public.useraccount.id;


--
-- Name: userdocument; Type: TABLE; Schema: public; Owner: oac_softwares
--

CREATE TABLE public.userdocument (
    id integer NOT NULL,
    "userId" integer NOT NULL,
    "docName" character varying(255) NOT NULL,
    "docUrl" character varying(255)
);


ALTER TABLE public.userdocument OWNER TO oac_softwares;

--
-- Name: userdocument_id_seq; Type: SEQUENCE; Schema: public; Owner: oac_softwares
--

CREATE SEQUENCE public.userdocument_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.userdocument_id_seq OWNER TO oac_softwares;

--
-- Name: userdocument_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: oac_softwares
--

ALTER SEQUENCE public.userdocument_id_seq OWNED BY public.userdocument.id;


--
-- Name: Promotions id; Type: DEFAULT; Schema: public; Owner: oac_softwares
--

ALTER TABLE ONLY public."Promotions" ALTER COLUMN id SET DEFAULT nextval('public."Promotions_id_seq"'::regclass);


--
-- Name: Team id; Type: DEFAULT; Schema: public; Owner: oac_softwares
--

ALTER TABLE ONLY public."Team" ALTER COLUMN id SET DEFAULT nextval('public."Team_id_seq"'::regclass);


--
-- Name: TeamLeader id; Type: DEFAULT; Schema: public; Owner: oac_softwares
--

ALTER TABLE ONLY public."TeamLeader" ALTER COLUMN id SET DEFAULT nextval('public."TeamLeader_id_seq"'::regclass);


--
-- Name: TeamMember id; Type: DEFAULT; Schema: public; Owner: oac_softwares
--

ALTER TABLE ONLY public."TeamMember" ALTER COLUMN id SET DEFAULT nextval('public."TeamMember_id_seq"'::regclass);


--
-- Name: designation id; Type: DEFAULT; Schema: public; Owner: oac_softwares
--

ALTER TABLE ONLY public.designation ALTER COLUMN id SET DEFAULT nextval('public.designation_id_seq'::regclass);


--
-- Name: leaveType id; Type: DEFAULT; Schema: public; Owner: oac_softwares
--

ALTER TABLE ONLY public."leaveType" ALTER COLUMN id SET DEFAULT nextval('public."leaveType_id_seq"'::regclass);


--
-- Name: role id; Type: DEFAULT; Schema: public; Owner: oac_softwares
--

ALTER TABLE ONLY public.role ALTER COLUMN id SET DEFAULT nextval('public.role_id_seq'::regclass);


--
-- Name: statutoryinfo id; Type: DEFAULT; Schema: public; Owner: oac_softwares
--

ALTER TABLE ONLY public.statutoryinfo ALTER COLUMN id SET DEFAULT nextval('public.statutoryinfo_id_seq'::regclass);


--
-- Name: user id; Type: DEFAULT; Schema: public; Owner: oac_softwares
--

ALTER TABLE ONLY public."user" ALTER COLUMN id SET DEFAULT nextval('public.user_id_seq'::regclass);


--
-- Name: userLeave id; Type: DEFAULT; Schema: public; Owner: oac_softwares
--

ALTER TABLE ONLY public."userLeave" ALTER COLUMN id SET DEFAULT nextval('public."userLeave_id_seq"'::regclass);


--
-- Name: userPersonal id; Type: DEFAULT; Schema: public; Owner: oac_softwares
--

ALTER TABLE ONLY public."userPersonal" ALTER COLUMN id SET DEFAULT nextval('public."userPersonal_id_seq"'::regclass);


--
-- Name: userPosition id; Type: DEFAULT; Schema: public; Owner: oac_softwares
--

ALTER TABLE ONLY public."userPosition" ALTER COLUMN id SET DEFAULT nextval('public."userPosition_id_seq"'::regclass);


--
-- Name: useraccount id; Type: DEFAULT; Schema: public; Owner: oac_softwares
--

ALTER TABLE ONLY public.useraccount ALTER COLUMN id SET DEFAULT nextval('public.useraccount_id_seq'::regclass);


--
-- Name: userdocument id; Type: DEFAULT; Schema: public; Owner: oac_softwares
--

ALTER TABLE ONLY public.userdocument ALTER COLUMN id SET DEFAULT nextval('public.userdocument_id_seq'::regclass);


--
-- Data for Name: Promotions; Type: TABLE DATA; Schema: public; Owner: oac_softwares
--

COPY public."Promotions" (id, "userId", "oldDesignationId", "designationId", "previousSalary", "newSalary", "effectiveDate", "promotionReason", "promotionDate", "createdAt", "updatedAt", "deletedAt") FROM stdin;
\.


--
-- Data for Name: Team; Type: TABLE DATA; Schema: public; Owner: oac_softwares
--

COPY public."Team" (id, "teamName", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: TeamLeader; Type: TABLE DATA; Schema: public; Owner: oac_softwares
--

COPY public."TeamLeader" (id, "teamId", "userId", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: TeamMember; Type: TABLE DATA; Schema: public; Owner: oac_softwares
--

COPY public."TeamMember" (id, "teamId", "userId", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: designation; Type: TABLE DATA; Schema: public; Owner: oac_softwares
--

COPY public.designation (id, "designationName", abbreviation, "roleId") FROM stdin;
\.


--
-- Data for Name: leaveType; Type: TABLE DATA; Schema: public; Owner: oac_softwares
--

COPY public."leaveType" (id, "leaveTypeName", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: role; Type: TABLE DATA; Schema: public; Owner: oac_softwares
--

COPY public.role (id, "roleName", abbreviation, status, department) FROM stdin;
1	Super Administrator	SA	t	\N
2	Quality Super Administrator	QSA	t	\N
\.


--
-- Data for Name: statutoryinfo; Type: TABLE DATA; Schema: public; Owner: oac_softwares
--

COPY public.statutoryinfo (id, "userId", "adharNo", "panNumber", "esiNumber", "pfNumber", "uanNumber", "insuranceNumber", "passportNumber", "passportExpiry") FROM stdin;
\.


--
-- Data for Name: user; Type: TABLE DATA; Schema: public; Owner: oac_softwares
--

COPY public."user" (id, name, "empNo", email, "phoneNumber", password, "roleId", status, "userImage", url, director, "paswordReset", "isTemporary", separated, "separationNote", "separationDate", "createdAt", "updatedAt") FROM stdin;
1	Quality Super Administrator	QSA001	qualityadmin@leedsaerospace.com	\N	$2b$10$K32W3G..37El42lzrbCgtOFDMNxDK.zLIKC9Rw3zYsB7FAs.AoaQy	2	t	\N	\N	f	f	t	f	\N	\N	2026-05-08 16:49:35.945+05:30	2026-05-08 16:49:35.945+05:30
\.


--
-- Data for Name: userLeave; Type: TABLE DATA; Schema: public; Owner: oac_softwares
--

COPY public."userLeave" (id, "userId", "leaveTypeId", "noOfDays", "takenLeaves", "leaveBalance", year, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: userPersonal; Type: TABLE DATA; Schema: public; Owner: oac_softwares
--

COPY public."userPersonal" (id, "userId", "dateOfJoining", "confirmationDate", "bloodGroup", "emergencyContactNo", "emergencyContactName", "emergencyContactRelation", "maritalStatus", "dateOfBirth", gender, "parentName", "spouseName", "referredBy", "reportingMangerId", "spouseContactNo", "parentContactNo", "motherName", "motherContactNo", "temporaryAddress", "permanentAddress", qualification, experience, "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: userPosition; Type: TABLE DATA; Schema: public; Owner: oac_softwares
--

COPY public."userPosition" (id, "userId", division, "costCentre", grade, location, department, office, salary, "probationPeriod", "probationNote", "officialMailId", "projectMailId", "designationId", "teamId", "confirmationDate") FROM stdin;
\.


--
-- Data for Name: useraccount; Type: TABLE DATA; Schema: public; Owner: oac_softwares
--

COPY public.useraccount (id, "userId", "bankName", "accountNo", "ifseCode", "paymentFrequency", "modeOfPayment", "branchName") FROM stdin;
\.


--
-- Data for Name: userdocument; Type: TABLE DATA; Schema: public; Owner: oac_softwares
--

COPY public.userdocument (id, "userId", "docName", "docUrl") FROM stdin;
\.


--
-- Name: Promotions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: oac_softwares
--

SELECT pg_catalog.setval('public."Promotions_id_seq"', 1, false);


--
-- Name: TeamLeader_id_seq; Type: SEQUENCE SET; Schema: public; Owner: oac_softwares
--

SELECT pg_catalog.setval('public."TeamLeader_id_seq"', 1, false);


--
-- Name: TeamMember_id_seq; Type: SEQUENCE SET; Schema: public; Owner: oac_softwares
--

SELECT pg_catalog.setval('public."TeamMember_id_seq"', 1, false);


--
-- Name: Team_id_seq; Type: SEQUENCE SET; Schema: public; Owner: oac_softwares
--

SELECT pg_catalog.setval('public."Team_id_seq"', 1, false);


--
-- Name: designation_id_seq; Type: SEQUENCE SET; Schema: public; Owner: oac_softwares
--

SELECT pg_catalog.setval('public.designation_id_seq', 1, false);


--
-- Name: leaveType_id_seq; Type: SEQUENCE SET; Schema: public; Owner: oac_softwares
--

SELECT pg_catalog.setval('public."leaveType_id_seq"', 1, false);


--
-- Name: role_id_seq; Type: SEQUENCE SET; Schema: public; Owner: oac_softwares
--

SELECT pg_catalog.setval('public.role_id_seq', 2, true);


--
-- Name: statutoryinfo_id_seq; Type: SEQUENCE SET; Schema: public; Owner: oac_softwares
--

SELECT pg_catalog.setval('public.statutoryinfo_id_seq', 1, false);


--
-- Name: userLeave_id_seq; Type: SEQUENCE SET; Schema: public; Owner: oac_softwares
--

SELECT pg_catalog.setval('public."userLeave_id_seq"', 1, false);


--
-- Name: userPersonal_id_seq; Type: SEQUENCE SET; Schema: public; Owner: oac_softwares
--

SELECT pg_catalog.setval('public."userPersonal_id_seq"', 1, false);


--
-- Name: userPosition_id_seq; Type: SEQUENCE SET; Schema: public; Owner: oac_softwares
--

SELECT pg_catalog.setval('public."userPosition_id_seq"', 1, false);


--
-- Name: user_id_seq; Type: SEQUENCE SET; Schema: public; Owner: oac_softwares
--

SELECT pg_catalog.setval('public.user_id_seq', 1, true);


--
-- Name: useraccount_id_seq; Type: SEQUENCE SET; Schema: public; Owner: oac_softwares
--

SELECT pg_catalog.setval('public.useraccount_id_seq', 1, false);


--
-- Name: userdocument_id_seq; Type: SEQUENCE SET; Schema: public; Owner: oac_softwares
--

SELECT pg_catalog.setval('public.userdocument_id_seq', 1, false);


--
-- Name: Promotions Promotions_pkey; Type: CONSTRAINT; Schema: public; Owner: oac_softwares
--

ALTER TABLE ONLY public."Promotions"
    ADD CONSTRAINT "Promotions_pkey" PRIMARY KEY (id);


--
-- Name: TeamLeader TeamLeader_pkey; Type: CONSTRAINT; Schema: public; Owner: oac_softwares
--

ALTER TABLE ONLY public."TeamLeader"
    ADD CONSTRAINT "TeamLeader_pkey" PRIMARY KEY (id);


--
-- Name: TeamMember TeamMember_pkey; Type: CONSTRAINT; Schema: public; Owner: oac_softwares
--

ALTER TABLE ONLY public."TeamMember"
    ADD CONSTRAINT "TeamMember_pkey" PRIMARY KEY (id);


--
-- Name: Team Team_pkey; Type: CONSTRAINT; Schema: public; Owner: oac_softwares
--

ALTER TABLE ONLY public."Team"
    ADD CONSTRAINT "Team_pkey" PRIMARY KEY (id);


--
-- Name: designation designation_pkey; Type: CONSTRAINT; Schema: public; Owner: oac_softwares
--

ALTER TABLE ONLY public.designation
    ADD CONSTRAINT designation_pkey PRIMARY KEY (id);


--
-- Name: leaveType leaveType_pkey; Type: CONSTRAINT; Schema: public; Owner: oac_softwares
--

ALTER TABLE ONLY public."leaveType"
    ADD CONSTRAINT "leaveType_pkey" PRIMARY KEY (id);


--
-- Name: role role_pkey; Type: CONSTRAINT; Schema: public; Owner: oac_softwares
--

ALTER TABLE ONLY public.role
    ADD CONSTRAINT role_pkey PRIMARY KEY (id);


--
-- Name: statutoryinfo statutoryinfo_pkey; Type: CONSTRAINT; Schema: public; Owner: oac_softwares
--

ALTER TABLE ONLY public.statutoryinfo
    ADD CONSTRAINT statutoryinfo_pkey PRIMARY KEY (id);


--
-- Name: userLeave userLeave_pkey; Type: CONSTRAINT; Schema: public; Owner: oac_softwares
--

ALTER TABLE ONLY public."userLeave"
    ADD CONSTRAINT "userLeave_pkey" PRIMARY KEY (id);


--
-- Name: userPersonal userPersonal_pkey; Type: CONSTRAINT; Schema: public; Owner: oac_softwares
--

ALTER TABLE ONLY public."userPersonal"
    ADD CONSTRAINT "userPersonal_pkey" PRIMARY KEY (id);


--
-- Name: userPosition userPosition_pkey; Type: CONSTRAINT; Schema: public; Owner: oac_softwares
--

ALTER TABLE ONLY public."userPosition"
    ADD CONSTRAINT "userPosition_pkey" PRIMARY KEY (id);


--
-- Name: user user_pkey; Type: CONSTRAINT; Schema: public; Owner: oac_softwares
--

ALTER TABLE ONLY public."user"
    ADD CONSTRAINT user_pkey PRIMARY KEY (id);


--
-- Name: useraccount useraccount_pkey; Type: CONSTRAINT; Schema: public; Owner: oac_softwares
--

ALTER TABLE ONLY public.useraccount
    ADD CONSTRAINT useraccount_pkey PRIMARY KEY (id);


--
-- Name: userdocument userdocument_pkey; Type: CONSTRAINT; Schema: public; Owner: oac_softwares
--

ALTER TABLE ONLY public.userdocument
    ADD CONSTRAINT userdocument_pkey PRIMARY KEY (id);


--
-- Name: Promotions Promotions_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: oac_softwares
--

ALTER TABLE ONLY public."Promotions"
    ADD CONSTRAINT "Promotions_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."user"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: designation designation_roleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: oac_softwares
--

ALTER TABLE ONLY public.designation
    ADD CONSTRAINT "designation_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES public.role(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: statutoryinfo statutoryinfo_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: oac_softwares
--

ALTER TABLE ONLY public.statutoryinfo
    ADD CONSTRAINT "statutoryinfo_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."user"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: userLeave userLeave_leaveTypeId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: oac_softwares
--

ALTER TABLE ONLY public."userLeave"
    ADD CONSTRAINT "userLeave_leaveTypeId_fkey" FOREIGN KEY ("leaveTypeId") REFERENCES public."leaveType"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: userPersonal userPersonal_reportingMangerId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: oac_softwares
--

ALTER TABLE ONLY public."userPersonal"
    ADD CONSTRAINT "userPersonal_reportingMangerId_fkey" FOREIGN KEY ("reportingMangerId") REFERENCES public."user"(id) ON UPDATE CASCADE;


--
-- Name: userPersonal userPersonal_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: oac_softwares
--

ALTER TABLE ONLY public."userPersonal"
    ADD CONSTRAINT "userPersonal_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."user"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: userPosition userPosition_designationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: oac_softwares
--

ALTER TABLE ONLY public."userPosition"
    ADD CONSTRAINT "userPosition_designationId_fkey" FOREIGN KEY ("designationId") REFERENCES public.designation(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: userPosition userPosition_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: oac_softwares
--

ALTER TABLE ONLY public."userPosition"
    ADD CONSTRAINT "userPosition_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."user"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: user user_roleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: oac_softwares
--

ALTER TABLE ONLY public."user"
    ADD CONSTRAINT "user_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES public.role(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: useraccount useraccount_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: oac_softwares
--

ALTER TABLE ONLY public.useraccount
    ADD CONSTRAINT "useraccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."user"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: userdocument userdocument_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: oac_softwares
--

ALTER TABLE ONLY public.userdocument
    ADD CONSTRAINT "userdocument_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."user"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

