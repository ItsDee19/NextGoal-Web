import { acceptableEnglishTranslation, assessEnglish, englishLocationText, plainJobText } from './english-language';

describe('English publication language assessment', () => {
    it.each(['Software Engineer', 'Engineer', 'Senior Data Analyst', 'Software Engineer, Developer Platform'])('recognizes short English role %s', (title) => {
        expect(assessEnglish(title, 'title')).toBe('english');
    });
    it.each(['Ingénieur logiciel', 'Data Strategist Assistant - Stage (6 mois) Octobre 2026 (F/H/NB)', '软件工程师', 'Software Engineer 软件工程师'])('requires translation for %s', (title) => {
        expect(assessEnglish(title, 'title')).not.toBe('english');
    });
    it('does not let a long English section hide a French sentence', () => {
        const description = 'We are looking for a software engineer to build reliable products and work closely with our team. '.repeat(10) + 'Vous travaillerez avec notre équipe pour créer des outils.';
        expect(assessEnglish(description, 'description')).toBe('foreign');
    });
    it('keeps ambiguous short text unpublished without translation evidence', () => {
        expect(assessEnglish('Bora', 'title')).toBe('uncertain');
        expect(acceptableEnglishTranslation('Bora', 'Bora', 'title')).toBe(false);
    });
    it('accepts English geographic labels while requiring translated foreign labels', () => {
        expect(assessEnglish('San Francisco, California · Remote', 'location')).toBe('english');
        expect(assessEnglish('Paris, France', 'location')).toBe('english');
        expect(assessEnglish('München, Deutschland', 'location')).toBe('foreign');
        expect(assessEnglish('東京, 日本', 'location')).toBe('foreign');
    });
    it('rejects unchanged foreign output and incomplete mixed-language output', () => {
        expect(acceptableEnglishTranslation('Ingénieur logiciel', 'Ingénieur logiciel', 'title')).toBe(false);
        expect(acceptableEnglishTranslation('Software Engineer 软件', '软件工程师', 'title')).toBe(false);
        expect(acceptableEnglishTranslation('Software Engineer', '软件工程师', 'title')).toBe(true);
    });
    it('normalizes source HTML and entities before assessment', () => {
        expect(plainJobText('<p>Build products &amp; services.</p><p>Remote</p>')).toBe('Build products & services.\nRemote');
    });
    it('accepts English descriptions with proper company and place names, including unchanged provider output', () => {
        const description = 'Join OpenAI in Des Moines to build reliable software products and help our customers solve complex problems.';
        expect(assessEnglish(description, 'description')).toBe('english');
        expect(acceptableEnglishTranslation(description, description, 'description')).toBe(true);
        expect(assessEnglish('Des Moines · Remote', 'location')).toBe('english');
    });
    it('uses English document context for short headings, source tags, currency codes, and product names', () => {
        const sourceExcerpt = 'We build reliable software that helps people solve complex problems and work with our customers every day. '.repeat(4) + `
Frontline
Frontliners operate across a broad spectrum of responsibilities, much like a startup CTO.
Position ID: P78056
#LI-Hybrid
Hourly Rate:
$40—$40 USD
We are looking for a software engineer who can work with our team to build useful products for our customers.`;
        expect(assessEnglish(sourceExcerpt, 'description')).toBe('english');
        expect(acceptableEnglishTranslation(sourceExcerpt, sourceExcerpt, 'description')).toBe(true);
    });
    it('ignores an ATS tracking tag when evaluating an otherwise English legal sentence', () => {
        const sentence = 'By clicking Submit Application, I understand and agree that the company and its affiliates will collect and process my information in accordance with the global recruiting privacy policy. #LI-Onsite';
        expect(assessEnglish(sentence, 'description')).toBe('english');
    });
    it('does not let document context hide a substantial foreign-language clause', () => {
        const english = 'We are looking for a software engineer to build reliable products and work closely with our team. '.repeat(15);
        const spanish = 'El candidato ideal tiene experiencia en sistemas modernos y buenas habilidades de comunicación, capacidad para resolver problemas complejos y entusiasmo por aprender nuevas tecnologías cada día.';
        expect(assessEnglish(english + spanish, 'description')).toBe('foreign');
        expect(assessEnglish(english + 'Bonjour tout le monde.', 'description')).not.toBe('english');
    });
    it.each(['Accelerations Programs Intern', 'Accountant, Cyprus', 'Online Programmer (March Of Giants)'])('recognizes actual English source title %s', (title) => {
        expect(assessEnglish(title, 'title')).toBe('english');
    });
    it('renders source country codes in English while preserving state codes and Latin geographic names', () => {
        expect(englishLocationText('Carentoir, fr')).toBe('Carentoir, France');
        expect(englishLocationText('Montreal, ca')).toBe('Montreal, Canada');
        expect(englishLocationText('Los Angeles, CA')).toBe('Los Angeles, CA');
        expect(assessEnglish('Hybrid - New York, NY', 'location')).toBe('english');
        expect(assessEnglish('Remote - Cyprus', 'location')).toBe('english');
        expect(assessEnglish('Carentoir, France', 'location')).toBe('english');
    });
    it.each(['Télétravail', 'À distance', 'Hybride', 'Vor Ort', 'Sverige', 'Paris · Télétravail'])('requires translation for foreign location label %s', (location) => {
        expect(assessEnglish(location, 'location')).toBe('foreign');
        expect(acceptableEnglishTranslation(location, location, 'location')).toBe(false);
    });
    it('does not treat arbitrary Latin location prose as a proper place name', () => {
        expect(assessEnglish('la sede está cerca del centro', 'location')).toBe('uncertain');
        expect(acceptableEnglishTranslation('la sede está cerca del centro', 'la sede está cerca del centro', 'location')).toBe(false);
        expect(assessEnglish('Carentoir', 'location')).toBe('english');
    });
});
