import { detectAll } from 'tinyld';
import * as cheerio from 'cheerio';

export type LanguageVerdict = 'english' | 'foreign' | 'uncertain';
export type JobTextField = 'title' | 'description' | 'location';

// Short titles and place names are too short for reliable statistical language detection.
// This conservative vocabulary is a positive allowlist, never an ASCII-is-English shortcut.
const englishWords = new Set(`a an and as at by for from in of on or the to with without
    engineer engineering software hardware developer development platform product manager management
    senior junior staff principal lead director head chief associate assistant executive analyst analysis
    data science scientist research researcher design designer technical technology business sales marketing
    customer support success service services operations operational finance financial accountant accounting
    legal counsel security infrastructure cloud network systems system site reliability quality assurance
    intern internship graduate entry early career experienced full time part contract temporary permanent
    remote hybrid onsite office based global worldwide distributed team teams enterprise commercial account
    accounts representative administrator administrative partner people human resources talent recruiter recruiting
    recruitment strategy strategist strategic specialist consultant consulting solutions solution architect architecture
    application applications frontend backend front back end fullstack stack mobile web desktop embedded
    machine learning artificial intelligence automation testing test development cybersecurity database devops
    analytics content writer copywriter editor creative visual user experience interface experience growth
    communications community event events field demand revenue enablement partnerships integration integrations
    implementation delivery program programs programme programmer online accelerations march giants project coordinator coordination supply chain logistics procurement
    workplace facilities risk compliance privacy fraud trust safety payments payroll tax treasury audit auditor
    vice president international regional country retail support manufacturing medical clinical nurse doctor
    physician healthcare laboratory technician mechanical electrical civil chemical material materials industrial
    production construction architect architecture physics physicist mathematics mathematician robotics modelling
    modeling antenna optical optics biology biologist chemistry chemist cloud graduate internship summer winter
    spring fall autumn benefits compensation requirements qualifications responsibilities about you we our your
    us work working join build building products useful reliable closely looking help will have are is be
    can must should this that these those opportunity opportunities why what how role roles position positions
    apply application team collaboration include including experience years required preferred skills knowledge
    equal employment employer diversity inclusion salary pay bonus equity flexible hours training education
    python java javascript typescript react node rust golang go ruby rails php scala swift kotlin c cpp
    net dotnet sql nosql ios android linux windows kubernetes docker terraform mongodb postgresql snowflake
    ai ml llm llms api apis aws gcp azure html css ux ui qa hr it sre rpa sap crm erp seo sem
    ceo cto cfo coo vp svp evp ii iii iv v emea apac amer apj us usa uk eu india california
    new york san francisco los angeles austin seattle boston chicago denver dallas atlanta des moines london paris
    berlin munich hamburg dublin amsterdam madrid barcelona lisbon porto toronto montreal vancouver ottawa
    sydney melbourne brisbane singapore tokyo osaka seoul taipei hong kong shanghai beijing shenzhen
    bengaluru bangalore hyderabad chennai mumbai pune delhi gurugram noida kolkata ahmedabad indore
    anywhere multiple locations location united states kingdom canada germany france australia japan korea
    china taiwan ireland netherlands spain portugal sweden norway denmark finland switzerland austria
    belgium poland czechia romania hungary greece cyprus italy brazil mexico argentina colombia chile peru
    israel dubai abu dhabi arab emirates south africa vietnam indonesia malaysia thailand philippines
    graduate graduates internship internships temporary hourly salaried position available technology technologies`
    .split(/\s+/).filter(Boolean));

// Avoid weak particles such as "des"/"du": they also occur in English place and company names.
const foreignMarkers = /\b(?:nous|notre|votre|vous|avec|pour|mois|stagiaire|octobre|ingénieur|ingénieure|développeur|développeuse|logiciel|poste|rejoignez|équipe|recherche|travail|emploi|développement|deutschland|münchen|entwickler|ingenieur|gesucht|und|für|métier|responsable|projet|comptable|contrat|recrutement|fernbedienung|trabajo|ingeniero|desarrollador|equipo|puesto|remoto|contrato|estágio|desenvolvedor|trabalho)\b/iu;
const foreignLocationMarkers = /(?:^|[^\p{L}])(?:télétravail|teletravail|à distance|a distance|hybride|vor ort|homeoffice|sverige|norge|españa|espana|brasil|italia|suomi|schweiz|österreich|osterreich|belgië|belgie|belgique|nederland|polska|danmark)(?=$|[^\p{L}])/iu;
const stateCodes = new Set('AL AK AZ AR CA CO CT DE FL GA HI ID IL IN IA KS KY LA ME MD MA MI MN MS MO MT NE NV NH NJ NM NY NC ND OH OK OR PA RI SC SD TN TX UT VT VA WA WV WI WY DC'.split(' '));
const regionNames = new Intl.DisplayNames(['en'], { type: 'region', fallback: 'code' });
const englishCountryNames = new Set<string>();
for (let first = 65; first <= 90; first++) {
    for (let second = 65; second <= 90; second++) {
        const code = String.fromCharCode(first, second);
        const name = regionNames.of(code);
        if (name && name !== code) englishCountryNames.add(name.toLowerCase());
    }
}
const properPlacePart = /^[\p{Lu}\p{Lt}][\p{Script=Latin}\p{M}'’.-]*(?:[ -][\p{Lu}\p{Lt}][\p{Script=Latin}\p{M}'’.-]*){0,5}$/u;

export function plainJobText(value?: string | null): string {
    if (!value) return '';
    // Providers occasionally return encoded HTML despite their plain-text field contract.
    const decoded = cheerio.load(value.replace(/<\s*br\s*\/?\s*>/gi, '\n').replace(/<\/(?:p|div|li)>/gi, '\n')).text();
    return decoded.replace(/\r\n?/g, '\n').replace(/[\t ]+/g, ' ').trim();
}

function hasNonLatinLetters(text: string): boolean {
    return /[^\p{Script=Latin}\p{M}\p{N}\p{P}\p{S}\p{Z}\s]/u.test(text);
}

export function englishLocationText(value?: string | null): string {
    const clean = plainJobText(value);
    // Some ATS feeds append lower-case ISO country codes. Preserve upper-case state codes (e.g. CA/NY).
    return clean.replace(/,\s*([a-z]{2})$/, (match, code: string) => {
        const country = regionNames.of(code.toUpperCase());
        return country && country !== code.toUpperCase() ? `, ${country}` : match;
    });
}

export function assessEnglish(text: string, field: JobTextField): LanguageVerdict {
    const clean = plainJobText(text)
        .replace(/https?:\/\/\S+|\S+@\S+\.\S+/g, '')
        // Known ATS metadata is not prose; TinyLD otherwise mistakes #LI tags for Volapük.
        .replace(/#LI-[A-Za-z0-9-]+\b/g, '')
        .replace(/\bPosition ID:\s*[A-Z0-9-]+\b/g, '')
        .trim();
    if (!/\p{L}/u.test(clean)) return 'english';
    if (hasNonLatinLetters(clean) || foreignMarkers.test(clean)) return 'foreign';
    if (field === 'location' && foreignLocationMarkers.test(clean)) return 'foreign';
    const words = clean.toLowerCase().match(/\p{L}+/gu) || [];
    if (words.length <= 16 && words.every((word) => englishWords.has(word))) return 'english';
    if (field === 'location') {
        const label = englishLocationText(clean)
            .replace(/^(?:remote|hybrid|onsite|on-site)\s*[-·:]\s*/i, '')
            .replace(/\s*[-·:]\s*(?:remote|hybrid|onsite|on-site)$/i, '');
        const parts = label.split(',').map((part) => part.trim());
        const region = parts[parts.length - 1];
        if (englishCountryNames.has(label.toLowerCase())) return 'english';
        if (parts.length > 1 && (englishCountryNames.has(region.toLowerCase()) || stateCodes.has(region))
            && parts.slice(0, -1).every((part) => properPlacePart.test(part))) return 'english';
        // A single capitalized Latin place name can remain unchanged in English. Arbitrary prose cannot.
        if (parts.length === 1 && !/\s/.test(label) && properPlacePart.test(label)) return 'english';
        return 'uncertain';
    }

    const [documentBest, documentSecond] = detectAll(clean);
    const documentIsEnglish = documentBest?.lang === 'en' && documentBest.accuracy >= 0.8
        && (!documentSecond || documentSecond.accuracy < 0.15);
    // Standalone headings, legal abbreviations and proper names carry too little statistical evidence.
    // In a confidently English document they inherit its language. Check substantial clauses separately
    // so a foreign paragraph cannot hide inside a longer English listing.
    const segments = field === 'description'
        ? clean.split(/(?<=[.!?])\s+|\n+/).flatMap((part) => part.match(/.{1,700}(?:\s|$)/g) || [part])
        : [clean];
    if (field === 'description' && documentIsEnglish) {
        for (const segment of segments) {
            const segmentWords = segment.toLowerCase().match(/\p{L}+/gu) || [];
            const [best] = detectAll(segment);
            // Short foreign phrases with no English vocabulary are positive contrary evidence;
            // an isolated company/product name is not enough to override the document.
            if (segmentWords.length >= 4 && !segmentWords.some((word) => englishWords.has(word))
                && best && best.lang !== 'en') return best.accuracy >= 0.8 ? 'foreign' : 'uncertain';
            if (segmentWords.length < 24) continue;
            if (best && best.lang !== 'en' && best.accuracy >= 0.45) return 'foreign';
        }
        return 'english';
    }
    let uncertain = false;
    for (const segment of segments.filter((part) => /\p{L}/u.test(part))) {
        const segmentWords = segment.toLowerCase().match(/\p{L}+/gu) || [];
        if (segmentWords.length <= 16 && segmentWords.every((word) => englishWords.has(word))) continue;
        const [best, second] = detectAll(segment);
        if (best?.lang === 'en' && best.accuracy >= 0.8 && (!second || second.accuracy < 0.15)) continue;
        if (best && best.lang !== 'en' && best.accuracy >= 0.45) return 'foreign';
        uncertain = true;
    }
    return uncertain ? 'uncertain' : 'english';
}

export function acceptableEnglishTranslation(output: string, original: string, field: JobTextField): boolean {
    const text = plainJobText(output);
    if (!text || hasNonLatinLetters(text) || foreignMarkers.test(text)) return false;
    const verdict = assessEnglish(text, field);
    if (verdict === 'english') return true;
    if (verdict === 'foreign') return false;
    // An unchanged ambiguous phrase has not been demonstrated to be translated.
    // Recognized proper geographic names already pass assessEnglish; ambiguous prose still needs evidence.
    return text !== plainJobText(original) && detectAll(text)[0]?.lang === 'en';
}

export function languageHint(text: string): string {
    return detectAll(text)[0]?.lang || 'und';
}
