import { CYKLY_TASKS, CYKLY_PREDICT } from './tasks-cykly.mjs';
// Banka úloh PrPr. Očakávané výstupy vypočíta tools/build-prpr.mjs spustením vzorového riešenia.
// Pole testu: { name, stdin, filesIn: {súbor: obsah}, outFiles: [súbory, ktoré má program vytvoriť] }

const MAIN = `#include <stdio.h>

int main(void) {

    return 0;
}
`;

export const CATEGORIES = [
  { id: 'zaklady', title: 'Vstup, výstup a výpočty', note: 'printf, scanf, formátovanie, aritmetika' },
  { id: 'podmienky', title: 'Podmienky a switch', note: 'if/else, logické operátory, switch' },
  { id: 'cykly', title: 'Cykly', note: 'for, while, do-while, čítanie do konca vstupu' },
  { id: 'funkcie', title: 'Funkcie', note: 'parametre, návratová hodnota, rekurzia' },
  { id: 'polia', title: 'Polia', note: 'jednorozmerné a dvojrozmerné polia, triedenie' },
  { id: 'subory', title: 'Súbory', note: 'fopen, fprintf, fscanf, getc, EOF' },
  { id: 'retazce', title: 'Reťazce a znaky', note: 'char, reťazce, fgets, znakové funkcie' },
  { id: 'ukazovatele', title: 'Ukazovatele', note: 'adresy, odovzdávanie odkazom, malloc' },
  { id: 'chyby', title: 'Nájdi a oprav chybu', note: 'typické chyby začiatočníkov' },
];

export const TASKS = [
  // ===================== ZÁKLADY =====================
  {
    id: 'z-sucet-priemer', cat: 'zaklady', level: 1, title: 'Súčet a priemer',
    statement: 'Načítaj tri celé čísla oddelené medzerou. Vypíš ich **súčet** a **priemer na 2 desatinné miesta** v tvare:\n```\nSucet: 12\nPriemer: 4.00\n```',
    starter: MAIN,
    reference: `#include <stdio.h>
int main(void) {
    int a, b, c;
    scanf("%d %d %d", &a, &b, &c);
    printf("Sucet: %d\\n", a + b + c);
    printf("Priemer: %.2f\\n", (a + b + c) / 3.0);
    return 0;
}`,
    hint: 'Pozor na celočíselné delenie: (a+b+c)/3 je celé číslo. Deľ číslom 3.0.',
    tests: [{ name: 'ukážka', stdin: '3 4 5\n' }, { name: 'neceločíselný priemer', stdin: '1 2 2\n' }, { name: 'záporné', stdin: '-5 0 4\n' }],
  },
  {
    id: 'z-kruh', cat: 'zaklady', level: 1, title: 'Obvod a obsah kruhu',
    statement: 'Načítaj polomer `r` (reálne číslo). Vypíš obvod a obsah kruhu na **3 desatinné miesta**, π = 3.14159265:\n```\nObvod: 12.566\nObsah: 12.566\n```',
    starter: MAIN,
    reference: `#include <stdio.h>
#define PI 3.14159265
int main(void) {
    double r;
    scanf("%lf", &r);
    printf("Obvod: %.3f\\n", 2 * PI * r);
    printf("Obsah: %.3f\\n", PI * r * r);
    return 0;
}`,
    hint: 'double sa načítava cez %lf, vypisuje cez %f (%.3f).',
    tests: [{ name: 'r = 2', stdin: '2\n' }, { name: 'r = 0.5', stdin: '0.5\n' }, { name: 'r = 10', stdin: '10\n' }],
  },
  {
    id: 'z-cas', cat: 'zaklady', level: 1, title: 'Sekundy na hodiny',
    statement: 'Načítaj nezáporný počet sekúnd. Vypíš ho v tvare `H:MM:SS` (minúty a sekundy vždy dvojciferne). Napr. `3725` → `1:02:05`.',
    starter: MAIN,
    reference: `#include <stdio.h>
int main(void) {
    int s;
    scanf("%d", &s);
    printf("%d:%02d:%02d\\n", s / 3600, s % 3600 / 60, s % 60);
    return 0;
}`,
    hint: 'Použi / a %. Dvojciferný výpis s nulou: %02d.',
    tests: [{ name: 'ukážka', stdin: '3725\n' }, { name: 'nula', stdin: '0\n' }, { name: 'viac ako deň', stdin: '90061\n' }, { name: 'presne hodina', stdin: '3600\n' }],
  },
  {
    id: 'z-cifry', cat: 'zaklady', level: 1, title: 'Ciferný súčet trojciferného čísla',
    statement: 'Načítaj kladné trojciferné číslo. Vypíš jeho cifry oddelené medzerou a na ďalšom riadku ich súčet.\n```\nvstup: 472\n4 7 2\n13\n```',
    starter: MAIN,
    reference: `#include <stdio.h>
int main(void) {
    int n;
    scanf("%d", &n);
    int a = n / 100, b = n / 10 % 10, c = n % 10;
    printf("%d %d %d\\n%d\\n", a, b, c, a + b + c);
    return 0;
}`,
    hint: 'Stovky n/100, desiatky n/10%10, jednotky n%10.',
    tests: [{ name: 'ukážka', stdin: '472\n' }, { name: 'nuly vnútri', stdin: '305\n' }, { name: '999', stdin: '999\n' }],
  },
  {
    id: 'z-vymena', cat: 'zaklady', level: 1, title: 'Výmena dvoch čísel',
    statement: 'Načítaj dve celé čísla `a b`. Vymeň ich hodnoty **pomocou tretej premennej** a vypíš `a=... b=...`.\n```\nvstup: 3 8\na=8 b=3\n```',
    starter: MAIN,
    reference: `#include <stdio.h>
int main(void) {
    int a, b, pom;
    scanf("%d %d", &a, &b);
    pom = a; a = b; b = pom;
    printf("a=%d b=%d\\n", a, b);
    return 0;
}`,
    tests: [{ name: 'ukážka', stdin: '3 8\n' }, { name: 'rovnaké', stdin: '5 5\n' }, { name: 'záporné', stdin: '-1 7\n' }],
  },
  {
    id: 'z-znaky', cat: 'zaklady', level: 2, title: 'Znak a jeho ASCII kód',
    statement: 'Načítaj jedno malé písmeno. Vypíš jeho ASCII kód, zodpovedajúce veľké písmeno a písmeno nasledujúce v abecede (po `z` nasleduje `a`).\n```\nvstup: c\n99 C d\n```',
    starter: MAIN,
    reference: `#include <stdio.h>
int main(void) {
    char c;
    scanf(" %c", &c);
    char dalsie = (c == 'z') ? 'a' : c + 1;
    printf("%d %c %c\\n", c, c - 'a' + 'A', dalsie);
    return 0;
}`,
    hint: 'Znak je v C číslo. Veľké písmeno: c - \'a\' + \'A\'.',
    tests: [{ name: 'ukážka', stdin: 'c\n' }, { name: 'z', stdin: 'z\n' }, { name: 'a', stdin: 'a\n' }],
  },

  // ===================== PODMIENKY =====================
  {
    id: 'p-max3', cat: 'podmienky', level: 1, title: 'Najväčšie z troch',
    statement: 'Načítaj tri celé čísla a vypíš najväčšie z nich.',
    starter: MAIN,
    reference: `#include <stdio.h>
int main(void) {
    int a, b, c, max;
    scanf("%d %d %d", &a, &b, &c);
    max = a;
    if (b > max) max = b;
    if (c > max) max = c;
    printf("%d\\n", max);
    return 0;
}`,
    tests: [{ name: 'max na konci', stdin: '1 2 3\n' }, { name: 'max na začiatku', stdin: '9 2 3\n' }, { name: 'záporné', stdin: '-5 -2 -9\n' }, { name: 'rovnaké', stdin: '4 4 4\n' }],
  },
  {
    id: 'p-parne', cat: 'podmienky', level: 1, title: 'Párne alebo nepárne',
    statement: 'Načítaj celé číslo a vypíš `parne` alebo `neparne`. Pozor na záporné čísla!',
    starter: MAIN,
    reference: `#include <stdio.h>
int main(void) {
    int n;
    scanf("%d", &n);
    if (n % 2 == 0) printf("parne\\n");
    else printf("neparne\\n");
    return 0;
}`,
    hint: 'V C je (-3) % 2 == -1, nie 1. Testuj radšej n % 2 == 0.',
    tests: [{ name: 'párne', stdin: '10\n' }, { name: 'nepárne', stdin: '7\n' }, { name: 'záporné nepárne', stdin: '-3\n' }, { name: 'nula', stdin: '0\n' }],
  },
  {
    id: 'p-priestupny', cat: 'podmienky', level: 1, title: 'Priestupný rok',
    statement: 'Rok je priestupný, ak je deliteľný 4 a nie je deliteľný 100, alebo je deliteľný 400. Načítaj rok a vypíš `ano` alebo `nie`.',
    starter: MAIN,
    reference: `#include <stdio.h>
int main(void) {
    int r;
    scanf("%d", &r);
    if ((r % 4 == 0 && r % 100 != 0) || r % 400 == 0) printf("ano\\n");
    else printf("nie\\n");
    return 0;
}`,
    tests: [{ name: '2024', stdin: '2024\n' }, { name: '1900', stdin: '1900\n' }, { name: '2000', stdin: '2000\n' }, { name: '2026', stdin: '2026\n' }],
  },
  {
    id: 'p-trojuholnik', cat: 'podmienky', level: 2, title: 'Druh trojuholníka',
    statement: 'Načítaj tri kladné celé čísla – dĺžky strán. Ak trojuholník neexistuje (neplatí trojuholníková nerovnosť), vypíš `neexistuje`. Inak vypíš `rovnostranny`, `rovnoramenny` alebo `roznostranny`.',
    starter: MAIN,
    reference: `#include <stdio.h>
int main(void) {
    int a, b, c;
    scanf("%d %d %d", &a, &b, &c);
    if (a + b <= c || a + c <= b || b + c <= a) printf("neexistuje\\n");
    else if (a == b && b == c) printf("rovnostranny\\n");
    else if (a == b || b == c || a == c) printf("rovnoramenny\\n");
    else printf("roznostranny\\n");
    return 0;
}`,
    hint: 'Najprv over existenciu, až potom druh. Rovnostranný je zároveň rovnoramenný, preto ho testuj skôr.',
    tests: [{ name: 'rovnostranný', stdin: '3 3 3\n' }, { name: 'rovnoramenný', stdin: '5 5 8\n' }, { name: 'rôznostranný', stdin: '3 4 5\n' }, { name: 'neexistuje', stdin: '1 2 3\n' }, { name: 'rovnoramenný inak', stdin: '7 4 7\n' }],
  },
  {
    id: 'p-kvadraticka', cat: 'podmienky', level: 2, title: 'Kvadratická rovnica',
    statement: 'Načítaj koeficienty `a b c` (reálne, a ≠ 0) rovnice ax² + bx + c = 0. Podľa diskriminantu vypíš:\n- `Dva korene: x1 x2` (najprv menší, na 2 des. miesta)\n- `Jeden koren: x`\n- `Ziadny realny koren`',
    starter: `#include <stdio.h>
#include <math.h>

int main(void) {

    return 0;
}
`,
    reference: `#include <stdio.h>
#include <math.h>
int main(void) {
    double a, b, c;
    scanf("%lf %lf %lf", &a, &b, &c);
    double D = b * b - 4 * a * c;
    if (D > 0) {
        double x1 = (-b - sqrt(D)) / (2 * a), x2 = (-b + sqrt(D)) / (2 * a);
        if (x1 > x2) { double p = x1; x1 = x2; x2 = p; }
        printf("Dva korene: %.2f %.2f\\n", x1, x2);
    } else if (D == 0) {
        printf("Jeden koren: %.2f\\n", -b / (2 * a));
    } else {
        printf("Ziadny realny koren\\n");
    }
    return 0;
}`,
    hint: 'sqrt je v math.h. Pozor: ak a < 0, vzorec s mínusom nemusí dať menší koreň.',
    tests: [{ name: 'dva korene', stdin: '1 -3 2\n' }, { name: 'jeden koreň', stdin: '1 2 1\n' }, { name: 'žiadny', stdin: '1 0 1\n' }, { name: 'a < 0', stdin: '-1 0 4\n' }],
  },
  {
    id: 'p-kalkulacka', cat: 'podmienky', level: 2, title: 'Kalkulačka (switch)',
    statement: 'Načítaj výraz v tvare `a op b`, kde a, b sú celé čísla a op je jeden z `+ - * / %`. Vypíš výsledok. Pri delení alebo zvyšku nulou vypíš `Delenie nulou`, pri neznámom operátore `Neznamy operator`. Použi **switch**.',
    starter: MAIN,
    reference: `#include <stdio.h>
int main(void) {
    int a, b;
    char op;
    scanf("%d %c %d", &a, &op, &b);
    switch (op) {
        case '+': printf("%d\\n", a + b); break;
        case '-': printf("%d\\n", a - b); break;
        case '*': printf("%d\\n", a * b); break;
        case '/':
        case '%':
            if (b == 0) printf("Delenie nulou\\n");
            else printf("%d\\n", op == '/' ? a / b : a % b);
            break;
        default: printf("Neznamy operator\\n");
    }
    return 0;
}`,
    hint: 'scanf("%d %c %d") – medzera pred %c preskočí biele znaky. Nezabudni na break!',
    tests: [{ name: 'súčet', stdin: '7 + 5\n' }, { name: 'delenie', stdin: '17 / 5\n' }, { name: 'zvyšok', stdin: '17 % 5\n' }, { name: 'delenie nulou', stdin: '3 / 0\n' }, { name: 'neznámy', stdin: '3 ^ 2\n' }],
  },

  // ===================== CYKLY =====================
  {
    id: 'c-sucet-n', cat: 'cykly', level: 1, title: 'Súčet od 1 po n',
    statement: 'Načítaj kladné celé číslo n a vypíš súčet 1 + 2 + … + n pomocou cyklu.',
    starter: MAIN,
    reference: `#include <stdio.h>
int main(void) {
    int n, i;
    long long s = 0;
    scanf("%d", &n);
    for (i = 1; i <= n; i++) s += i;
    printf("%lld\\n", s);
    return 0;
}`,
    tests: [{ name: 'n = 10', stdin: '10\n' }, { name: 'n = 1', stdin: '1\n' }, { name: 'veľké n', stdin: '100000\n' }],
  },
  {
    id: 'c-faktorial', cat: 'cykly', level: 1, title: 'Faktoriál',
    statement: 'Načítaj n (0 ≤ n ≤ 20) a vypíš n!. Pozor, 0! = 1 a `int` na veľké hodnoty nestačí.',
    starter: MAIN,
    reference: `#include <stdio.h>
int main(void) {
    int n, i;
    unsigned long long f = 1;
    scanf("%d", &n);
    for (i = 2; i <= n; i++) f *= i;
    printf("%llu\\n", f);
    return 0;
}`,
    hint: 'unsigned long long a %llu.',
    tests: [{ name: '5!', stdin: '5\n' }, { name: '0!', stdin: '0\n' }, { name: '20!', stdin: '20\n' }],
  },
  {
    id: 'c-nsd', cat: 'cykly', level: 2, title: 'NSD a NSN',
    statement: 'Načítaj dve kladné celé čísla a vypíš ich najväčší spoločný deliteľ a najmenší spoločný násobok (Euklidov algoritmus):\n```\nvstup: 12 18\nNSD: 6\nNSN: 36\n```',
    starter: MAIN,
    reference: `#include <stdio.h>
int main(void) {
    int a, b, x, y, t;
    scanf("%d %d", &a, &b);
    x = a; y = b;
    while (y != 0) { t = x % y; x = y; y = t; }
    printf("NSD: %d\\nNSN: %d\\n", x, a / x * b);
    return 0;
}`,
    hint: 'NSD(a, b) = NSD(b, a % b), kým b nie je 0. NSN = a / NSD * b.',
    tests: [{ name: 'ukážka', stdin: '12 18\n' }, { name: 'nesúdeliteľné', stdin: '7 9\n' }, { name: 'jedno delí druhé', stdin: '5 25\n' }],
  },
  {
    id: 'c-fibonacci', cat: 'cykly', level: 1, title: 'Fibonacciho postupnosť',
    statement: 'Načítaj n ≥ 1 a vypíš prvých n členov Fibonacciho postupnosti (1 1 2 3 5 …) oddelených medzerou, bez medzery na konci.',
    starter: MAIN,
    reference: `#include <stdio.h>
int main(void) {
    int n, i;
    long long a = 1, b = 1, t;
    scanf("%d", &n);
    for (i = 0; i < n; i++) {
        if (i > 0) printf(" ");
        printf("%lld", a);
        t = a + b; a = b; b = t;
    }
    printf("\\n");
    return 0;
}`,
    hint: 'Medzeru vypisuj pred každým číslom okrem prvého.',
    tests: [{ name: 'n = 7', stdin: '7\n' }, { name: 'n = 1', stdin: '1\n' }, { name: 'n = 2', stdin: '2\n' }, { name: 'n = 30', stdin: '30\n' }],
  },
  {
    id: 'c-delitele', cat: 'cykly', level: 1, title: 'Delitele čísla',
    statement: 'Načítaj kladné celé číslo a vypíš všetky jeho delitele vzostupne, oddelené medzerou. Na ďalší riadok vypíš ich počet.',
    starter: MAIN,
    reference: `#include <stdio.h>
int main(void) {
    int n, d, pocet = 0;
    scanf("%d", &n);
    for (d = 1; d <= n; d++) {
        if (n % d == 0) {
            if (pocet > 0) printf(" ");
            printf("%d", d);
            pocet++;
        }
    }
    printf("\\n%d\\n", pocet);
    return 0;
}`,
    tests: [{ name: '12', stdin: '12\n' }, { name: 'prvočíslo', stdin: '13\n' }, { name: '1', stdin: '1\n' }],
  },
  {
    id: 'c-trojuholnik', cat: 'cykly', level: 2, title: 'Pyramída z hviezdičiek',
    statement: 'Načítaj n (1–20) a vykresli rovnoramennú pyramídu výšky n. Riadok i (od 1) má n−i medzier a 2i−1 hviezdičiek, bez medzier na konci:\n```\nn = 3\n  *\n ***\n*****\n```',
    starter: MAIN,
    reference: `#include <stdio.h>
int main(void) {
    int n, i, j;
    scanf("%d", &n);
    for (i = 1; i <= n; i++) {
        for (j = 0; j < n - i; j++) printf(" ");
        for (j = 0; j < 2 * i - 1; j++) printf("*");
        printf("\\n");
    }
    return 0;
}`,
    hint: 'Vnorené cykly: vonkajší pre riadky, dva vnútorné pre medzery a hviezdičky.',
    tests: [{ name: 'n = 3', stdin: '3\n' }, { name: 'n = 1', stdin: '1\n' }, { name: 'n = 5', stdin: '5\n' }],
  },
  {
    id: 'c-do-konca', cat: 'cykly', level: 2, title: 'Čítanie do konca vstupu',
    statement: 'Na vstupe je neznámy počet celých čísel. Načítaj všetky (využi návratovú hodnotu `scanf`) a vypíš:\n```\nPocet: 4\nSucet: 10\nMin: 1\nMax: 4\n```\nAk na vstupe nie je žiadne číslo, vypíš iba `Ziadne cisla`.',
    starter: MAIN,
    reference: `#include <stdio.h>
int main(void) {
    int x, pocet = 0, sucet = 0, min = 0, max = 0;
    while (scanf("%d", &x) == 1) {
        if (pocet == 0 || x < min) min = x;
        if (pocet == 0 || x > max) max = x;
        sucet += x;
        pocet++;
    }
    if (pocet == 0) printf("Ziadne cisla\\n");
    else printf("Pocet: %d\\nSucet: %d\\nMin: %d\\nMax: %d\\n", pocet, sucet, min, max);
    return 0;
}`,
    hint: 'while (scanf("%d", &x) == 1) { ... }. Min a max inicializuj prvým číslom.',
    tests: [{ name: 'ukážka', stdin: '3 1 4 2\n' }, { name: 'na viacerých riadkoch', stdin: '-5\n10\n7\n' }, { name: 'prázdny vstup', stdin: '' }, { name: 'jedno číslo', stdin: '42' }],
  },
  {
    id: 'c-prvocisla', cat: 'cykly', level: 2, title: 'Prvočísla v intervale',
    statement: 'Načítaj dve celé čísla (hranice môžu byť aj naopak). Vypíš každé prvočíslo z intervalu na samostatný riadok. Ak tam žiadne nie je, vypíš `Prvocislo neexistuje`. (Podobné ako CV04 4.1.)',
    starter: MAIN,
    reference: `#include <stdio.h>
int main(void) {
    int a, b, t, i, d, je, nasiel = 0;
    scanf("%d %d", &a, &b);
    if (a > b) { t = a; a = b; b = t; }
    for (i = a; i <= b; i++) {
        if (i < 2) continue;
        je = 1;
        for (d = 2; d * d <= i; d++) if (i % d == 0) { je = 0; break; }
        if (je) { printf("%d\\n", i); nasiel = 1; }
    }
    if (!nasiel) printf("Prvocislo neexistuje\\n");
    return 0;
}`,
    tests: [{ name: '1 10', stdin: '1 10\n' }, { name: 'naopak', stdin: '20 11\n' }, { name: 'žiadne', stdin: '24 28\n' }, { name: 'záporné', stdin: '-10 3\n' }],
  },

  // ===================== FUNKCIE =====================
  {
    id: 'f-mocnina', cat: 'funkcie', level: 1, title: 'Funkcia mocnina',
    statement: 'Napíš funkciu `long long mocnina(int x, int n)`, ktorá vráti xⁿ (n ≥ 0) **bez** knižnice math.h. V main načítaj x a n a vypíš výsledok.',
    starter: `#include <stdio.h>

long long mocnina(int x, int n) {

}

int main(void) {

    return 0;
}
`,
    reference: `#include <stdio.h>
long long mocnina(int x, int n) {
    long long v = 1;
    int i;
    for (i = 0; i < n; i++) v *= x;
    return v;
}
int main(void) {
    int x, n;
    scanf("%d %d", &x, &n);
    printf("%lld\\n", mocnina(x, n));
    return 0;
}`,
    tests: [{ name: '2^10', stdin: '2 10\n' }, { name: 'x^0', stdin: '7 0\n' }, { name: 'záporný základ', stdin: '-3 3\n' }],
  },
  {
    id: 'f-pocet-prvocisel', cat: 'funkcie', level: 2, title: 'Funkcia je_prvocislo',
    statement: 'Napíš funkciu `int je_prvocislo(int n)` (vráti 1 alebo 0). Pomocou nej vypíš počet prvočísel ≤ N, kde N načítaš zo vstupu.',
    starter: `#include <stdio.h>

int je_prvocislo(int n) {

}

int main(void) {

    return 0;
}
`,
    reference: `#include <stdio.h>
int je_prvocislo(int n) {
    int d;
    if (n < 2) return 0;
    for (d = 2; d * d <= n; d++) if (n % d == 0) return 0;
    return 1;
}
int main(void) {
    int N, i, pocet = 0;
    scanf("%d", &N);
    for (i = 2; i <= N; i++) pocet += je_prvocislo(i);
    printf("%d\\n", pocet);
    return 0;
}`,
    tests: [{ name: 'N = 10', stdin: '10\n' }, { name: 'N = 1', stdin: '1\n' }, { name: 'N = 1000', stdin: '1000\n' }],
  },
  {
    id: 'f-nsd-rek', cat: 'funkcie', level: 2, title: 'Rekurzívny NSD',
    statement: 'Napíš **rekurzívnu** funkciu `int nsd(int a, int b)`. Načítaj neznámy počet dvojíc čísel (do konca vstupu) a pre každú vypíš NSD na samostatný riadok.',
    starter: `#include <stdio.h>

int nsd(int a, int b) {

}

int main(void) {

    return 0;
}
`,
    reference: `#include <stdio.h>
int nsd(int a, int b) {
    if (b == 0) return a;
    return nsd(b, a % b);
}
int main(void) {
    int a, b;
    while (scanf("%d %d", &a, &b) == 2) printf("%d\\n", nsd(a, b));
    return 0;
}`,
    hint: 'Základný prípad: nsd(a, 0) = a.',
    tests: [{ name: 'tri dvojice', stdin: '12 18\n100 75\n17 5\n' }, { name: 'jedna dvojica', stdin: '48 36\n' }],
  },
  {
    id: 'f-cifsucet-rek', cat: 'funkcie', level: 2, title: 'Rekurzívny ciferný súčet',
    statement: 'Napíš rekurzívnu funkciu `int cs(int n)`, ktorá vráti ciferný súčet nezáporného čísla n. Potom opakuj ciferný súčet, kým nedostaneš jednociferné číslo (ciferný koreň). Vypíš `cs(n)` a ciferný koreň:\n```\nvstup: 9875\n29 2\n```',
    starter: MAIN,
    reference: `#include <stdio.h>
int cs(int n) {
    if (n < 10) return n;
    return n % 10 + cs(n / 10);
}
int main(void) {
    int n, k;
    scanf("%d", &n);
    k = cs(n);
    printf("%d ", k);
    while (k >= 10) k = cs(k);
    printf("%d\\n", k);
    return 0;
}`,
    tests: [{ name: 'ukážka', stdin: '9875\n' }, { name: 'jednociferné', stdin: '7\n' }, { name: 'nula', stdin: '0\n' }],
  },
  {
    id: 'f-pocet-cifier', cat: 'funkcie', level: 1, title: 'Počet cifier',
    statement: 'Napíš funkciu `int pocet_cifier(long long n)`, ktorá vráti počet cifier čísla (aj záporného, 0 má 1 cifru). Načítaj číslo a vypíš počet cifier.',
    starter: MAIN,
    reference: `#include <stdio.h>
int pocet_cifier(long long n) {
    int p = 1;
    if (n < 0) n = -n;
    while (n >= 10) { n /= 10; p++; }
    return p;
}
int main(void) {
    long long n;
    scanf("%lld", &n);
    printf("%d\\n", pocet_cifier(n));
    return 0;
}`,
    tests: [{ name: '12345', stdin: '12345\n' }, { name: '0', stdin: '0\n' }, { name: 'záporné', stdin: '-907\n' }],
  },

  // ===================== POLIA =====================
  {
    id: 'a-obrat', cat: 'polia', level: 1, title: 'Obrátené poradie',
    statement: 'Načítaj n (1–100) a potom n celých čísel. Vypíš ich v opačnom poradí oddelené medzerou.',
    starter: MAIN,
    reference: `#include <stdio.h>
int main(void) {
    int n, i, a[100];
    scanf("%d", &n);
    for (i = 0; i < n; i++) scanf("%d", &a[i]);
    for (i = n - 1; i >= 0; i--) printf("%d%s", a[i], i > 0 ? " " : "\\n");
    return 0;
}`,
    tests: [{ name: 'päť čísel', stdin: '5\n1 2 3 4 5\n' }, { name: 'jedno', stdin: '1\n9\n' }],
  },
  {
    id: 'a-statistika', cat: 'polia', level: 1, title: 'Minimum, maximum, priemer a nadpriemerné',
    statement: 'Načítaj n (1–100) a n celých čísel. Vypíš minimum, maximum, priemer (2 des. miesta) a počet čísel väčších ako priemer:\n```\nMin: 1\nMax: 9\nPriemer: 4.40\nNad priemerom: 2\n```',
    starter: MAIN,
    reference: `#include <stdio.h>
int main(void) {
    int n, i, a[100], min, max, nad = 0;
    double sucet = 0, pr;
    scanf("%d", &n);
    for (i = 0; i < n; i++) scanf("%d", &a[i]);
    min = max = a[0];
    for (i = 0; i < n; i++) {
        if (a[i] < min) min = a[i];
        if (a[i] > max) max = a[i];
        sucet += a[i];
    }
    pr = sucet / n;
    for (i = 0; i < n; i++) if (a[i] > pr) nad++;
    printf("Min: %d\\nMax: %d\\nPriemer: %.2f\\nNad priemerom: %d\\n", min, max, pr, nad);
    return 0;
}`,
    hint: 'Počet nadpriemerných vieš až po výpočte priemeru, preto treba pole.',
    tests: [{ name: 'ukážka', stdin: '5\n3 9 1 4 5\n' }, { name: 'rovnaké', stdin: '3\n2 2 2\n' }, { name: 'záporné', stdin: '4\n-1 -8 3 0\n' }],
  },
  {
    id: 'a-bubble', cat: 'polia', level: 2, title: 'Bublinkové triedenie',
    statement: 'Načítaj n (1–100) a n celých čísel. Usporiadaj ich vzostupne **bublinkovým triedením** a vypíš oddelené medzerou.',
    starter: MAIN,
    reference: `#include <stdio.h>
int main(void) {
    int n, i, j, t, a[100];
    scanf("%d", &n);
    for (i = 0; i < n; i++) scanf("%d", &a[i]);
    for (i = 0; i < n - 1; i++)
        for (j = 0; j < n - 1 - i; j++)
            if (a[j] > a[j + 1]) { t = a[j]; a[j] = a[j + 1]; a[j + 1] = t; }
    for (i = 0; i < n; i++) printf("%d%s", a[i], i < n - 1 ? " " : "\\n");
    return 0;
}`,
    tests: [{ name: 'neusporiadané', stdin: '6\n5 1 4 2 8 0\n' }, { name: 'už usporiadané', stdin: '3\n1 2 3\n' }, { name: 's duplicitami', stdin: '5\n3 1 3 -2 1\n' }],
  },
  {
    id: 'a-hladaj', cat: 'polia', level: 1, title: 'Vyhľadanie prvku',
    statement: 'Načítaj n, potom n celých čísel a nakoniec hľadané číslo x. Vypíš index (od 0) **prvého** výskytu x alebo `-1`, ak sa v poli nenachádza.',
    starter: MAIN,
    reference: `#include <stdio.h>
int main(void) {
    int n, i, x, a[100], idx = -1;
    scanf("%d", &n);
    for (i = 0; i < n; i++) scanf("%d", &a[i]);
    scanf("%d", &x);
    for (i = 0; i < n; i++) if (a[i] == x) { idx = i; break; }
    printf("%d\\n", idx);
    return 0;
}`,
    tests: [{ name: 'nájdené', stdin: '5\n4 7 1 7 3\n7\n' }, { name: 'nenájdené', stdin: '3\n1 2 3\n9\n' }, { name: 'na začiatku', stdin: '2\n5 5\n5\n' }],
  },
  {
    id: 'a-cetnost', cat: 'polia', level: 2, title: 'Výskyt cifier',
    statement: 'Načítaj neznámy počet nezáporných celých čísel (do konca vstupu). Spočítaj, koľkokrát sa v nich vyskytuje každá cifra 0–9, a vypíš len tie s nenulovým výskytom v tvare `cifra: pocet`.',
    starter: MAIN,
    reference: `#include <stdio.h>
int main(void) {
    int pocty[10] = {0}, x, i;
    while (scanf("%d", &x) == 1) {
        if (x == 0) pocty[0]++;
        while (x > 0) { pocty[x % 10]++; x /= 10; }
    }
    for (i = 0; i < 10; i++) if (pocty[i] > 0) printf("%d: %d\\n", i, pocty[i]);
    return 0;
}`,
    hint: 'Pole pocty[10] inicializuj nulami. Pozor na číslo 0 (má jednu cifru).',
    tests: [{ name: 'ukážka', stdin: '1123 450 7\n' }, { name: 'nula', stdin: '0 10\n' }],
  },
  {
    id: 'a-matica', cat: 'polia', level: 2, title: 'Matica – súčty riadkov a stĺpcov',
    statement: 'Načítaj rozmery r s (1–10) a maticu r×s celých čísel. Pre každý riadok vypíš jeho súčet na samostatný riadok, potom na jeden riadok súčty stĺpcov oddelené medzerou.',
    starter: MAIN,
    reference: `#include <stdio.h>
int main(void) {
    int r, s, i, j, m[10][10], sum;
    scanf("%d %d", &r, &s);
    for (i = 0; i < r; i++) for (j = 0; j < s; j++) scanf("%d", &m[i][j]);
    for (i = 0; i < r; i++) {
        sum = 0;
        for (j = 0; j < s; j++) sum += m[i][j];
        printf("%d\\n", sum);
    }
    for (j = 0; j < s; j++) {
        sum = 0;
        for (i = 0; i < r; i++) sum += m[i][j];
        printf("%d%s", sum, j < s - 1 ? " " : "\\n");
    }
    return 0;
}`,
    tests: [{ name: '2×3', stdin: '2 3\n1 2 3\n4 5 6\n' }, { name: '1×1', stdin: '1 1\n-7\n' }],
  },

  // ===================== SÚBORY =====================
  {
    id: 's-mocniny', cat: 'subory', level: 1, title: 'Zápis do súboru',
    statement: 'Načítaj n zo štandardného vstupu. Do súboru `mocniny.txt` zapíš n riadkov v tvare `i^2 = hodnota` pre i = 1…n (i na 2 miesta). Na obrazovku vypíš `Hotovo`.\n```\n 1^2 = 1\n 2^2 = 4\n```',
    starter: MAIN,
    reference: `#include <stdio.h>
int main(void) {
    int n, i;
    FILE *f;
    scanf("%d", &n);
    if ((f = fopen("mocniny.txt", "w")) == NULL) { printf("Chyba\\n"); return 1; }
    for (i = 1; i <= n; i++) fprintf(f, "%2d^2 = %d\\n", i, i * i);
    fclose(f);
    printf("Hotovo\\n");
    return 0;
}`,
    hint: 'fopen("mocniny.txt", "w"), fprintf(f, ...), na konci fclose(f).',
    tests: [{ name: 'n = 3', stdin: '3\n', outFiles: ['mocniny.txt'] }, { name: 'n = 12', stdin: '12\n', outFiles: ['mocniny.txt'] }],
  },
  {
    id: 's-pocty', cat: 'subory', level: 1, title: 'Riadky, znaky a medzery v súbore',
    statement: 'Prečítaj súbor `text.txt` znak po znaku (`getc`, `EOF`). Vypíš počet riadkov (počet znakov `\\n`), počet všetkých znakov a počet medzier:\n```\nRiadky: 2\nZnaky: 18\nMedzery: 3\n```\nAk sa súbor nedá otvoriť, vypíš `Subor sa neda otvorit`.',
    starter: MAIN,
    reference: `#include <stdio.h>
int main(void) {
    FILE *f;
    int c, riadky = 0, znaky = 0, medzery = 0;
    if ((f = fopen("text.txt", "r")) == NULL) { printf("Subor sa neda otvorit\\n"); return 0; }
    while ((c = getc(f)) != EOF) {
        znaky++;
        if (c == '\\n') riadky++;
        if (c == ' ') medzery++;
    }
    fclose(f);
    printf("Riadky: %d\\nZnaky: %d\\nMedzery: %d\\n", riadky, znaky, medzery);
    return 0;
}`,
    hint: 'Premenná pre getc musí byť int, nie char.',
    tests: [{ name: 'dva riadky', filesIn: { 'text.txt': 'ahoj svet\nako sa mas\n' } }, { name: 'prázdny', filesIn: { 'text.txt': '' } }, { name: 'súbor chýba', filesIn: {} }],
  },
  {
    id: 's-velke', cat: 'subory', level: 2, title: 'Kópia s veľkými písmenami',
    statement: 'Skopíruj obsah súboru `vstup.txt` do súboru `vystup.txt` tak, že malé písmená zmeníš na veľké (ostatné znaky ostanú). Na obrazovku vypíš počet zmenených znakov.',
    starter: `#include <stdio.h>
#include <ctype.h>

int main(void) {

    return 0;
}
`,
    reference: `#include <stdio.h>
#include <ctype.h>
int main(void) {
    FILE *fr, *fw;
    int c, zmenene = 0;
    fr = fopen("vstup.txt", "r");
    fw = fopen("vystup.txt", "w");
    if (fr == NULL || fw == NULL) { printf("Chyba suboru\\n"); return 1; }
    while ((c = getc(fr)) != EOF) {
        if (islower(c)) { c = toupper(c); zmenene++; }
        putc(c, fw);
    }
    fclose(fr);
    fclose(fw);
    printf("%d\\n", zmenene);
    return 0;
}`,
    tests: [{ name: 'text', filesIn: { 'vstup.txt': 'Ahoj, Svet 2026!\nc jazyk\n' }, outFiles: ['vystup.txt'] }, { name: 'bez písmen', filesIn: { 'vstup.txt': '123 #$\n' }, outFiles: ['vystup.txt'] }],
  },
  {
    id: 's-cisla', cat: 'subory', level: 1, title: 'Čísla zo súboru',
    statement: 'Súbor `cisla.txt` obsahuje neznámy počet reálnych čísel. Načítaj ich cez `fscanf` (využi návratovú hodnotu) a vypíš počet a priemer (2 des. miesta). Ak súbor neobsahuje číslo, vypíš `Prazdny subor`.',
    starter: MAIN,
    reference: `#include <stdio.h>
int main(void) {
    FILE *f = fopen("cisla.txt", "r");
    double x, s = 0;
    int n = 0;
    if (f == NULL) { printf("Chyba\\n"); return 1; }
    while (fscanf(f, "%lf", &x) == 1) { s += x; n++; }
    fclose(f);
    if (n == 0) printf("Prazdny subor\\n");
    else printf("Pocet: %d\\nPriemer: %.2f\\n", n, s / n);
    return 0;
}`,
    tests: [{ name: 'čísla', filesIn: { 'cisla.txt': '1.5 2.5\n10\n-4\n' } }, { name: 'prázdny', filesIn: { 'cisla.txt': '\n' } }],
  },
  {
    id: 's-spoj', cat: 'subory', level: 2, title: 'Spojenie dvoch súborov',
    statement: 'Do súboru `spolu.txt` zapíš najprv celý obsah `a.txt`, potom celý obsah `b.txt`. Na obrazovku vypíš celkový počet skopírovaných znakov.',
    starter: MAIN,
    reference: `#include <stdio.h>
int kopiruj(FILE *odkial, FILE *kam) {
    int c, n = 0;
    while ((c = getc(odkial)) != EOF) { putc(c, kam); n++; }
    return n;
}
int main(void) {
    FILE *a = fopen("a.txt", "r"), *b = fopen("b.txt", "r"), *w = fopen("spolu.txt", "w");
    int n;
    if (!a || !b || !w) { printf("Chyba\\n"); return 1; }
    n = kopiruj(a, w) + kopiruj(b, w);
    fclose(a); fclose(b); fclose(w);
    printf("%d\\n", n);
    return 0;
}`,
    tests: [{ name: 'dva súbory', filesIn: { 'a.txt': 'prvy\nsubor\n', 'b.txt': 'druhy\n' }, outFiles: ['spolu.txt'] }],
  },

  // ===================== REŤAZCE =====================
  {
    id: 'r-dlzka', cat: 'retazce', level: 1, title: 'Dĺžka reťazca bez strlen',
    statement: 'Načítaj jedno slovo (max. 100 znakov) cez `scanf("%s")`. Vypíš jeho dĺžku **bez použitia strlen** a slovo odzadu.',
    starter: MAIN,
    reference: `#include <stdio.h>
int main(void) {
    char s[101];
    int n = 0, i;
    scanf("%100s", s);
    while (s[n] != '\\0') n++;
    printf("%d\\n", n);
    for (i = n - 1; i >= 0; i--) putchar(s[i]);
    putchar('\\n');
    return 0;
}`,
    hint: 'Reťazec končí znakom \'\\0\'.',
    tests: [{ name: 'programovanie', stdin: 'programovanie\n' }, { name: 'jeden znak', stdin: 'a\n' }],
  },
  {
    id: 'r-palindrom', cat: 'retazce', level: 2, title: 'Palindróm',
    statement: 'Na vstupe je neznámy počet slov. Pre každé vypíš `slovo je palindrom` alebo `slovo nie je palindrom`. Veľké a malé písmená **nerozlišuj** (Anna je palindróm).',
    starter: `#include <stdio.h>
#include <string.h>
#include <ctype.h>

int main(void) {

    return 0;
}
`,
    reference: `#include <stdio.h>
#include <string.h>
#include <ctype.h>
int je_palindrom(const char *s) {
    int i = 0, j = (int)strlen(s) - 1;
    while (i < j) {
        if (tolower((unsigned char)s[i]) != tolower((unsigned char)s[j])) return 0;
        i++; j--;
    }
    return 1;
}
int main(void) {
    char s[101];
    while (scanf("%100s", s) == 1) printf("%s %s palindrom\\n", s, je_palindrom(s) ? "je" : "nie je");
    return 0;
}`,
    tests: [{ name: 'mix', stdin: 'Anna kajak auto Radar\n' }, { name: 'jeden znak', stdin: 'x\n' }],
  },
  {
    id: 'r-samohlasky', cat: 'retazce', level: 1, title: 'Samohlásky v riadku',
    statement: 'Načítaj celý riadok textu (max. 200 znakov, `fgets`). Vypíš počet samohlások (a e i o u y, malé aj veľké), spoluhlások (ostatné písmená) a číslic:\n```\nSamohlasky: 3, spoluhlasky: 5, cislice: 2\n```',
    starter: `#include <stdio.h>
#include <ctype.h>
#include <string.h>

int main(void) {

    return 0;
}
`,
    reference: `#include <stdio.h>
#include <ctype.h>
#include <string.h>
int main(void) {
    char r[202];
    int i, sam = 0, spol = 0, cis = 0;
    if (fgets(r, sizeof r, stdin) == NULL) r[0] = '\\0';
    for (i = 0; r[i] != '\\0'; i++) {
        char c = tolower(r[i]);
        if (c == 'a' || c == 'e' || c == 'i' || c == 'o' || c == 'u' || c == 'y') sam++;
        else if (isalpha(c)) spol++;
        else if (isdigit(c)) cis++;
    }
    printf("Samohlasky: %d, spoluhlasky: %d, cislice: %d\\n", sam, spol, cis);
    return 0;
}`,
    hint: 'fgets číta aj znak nového riadku. tolower zjednoduší porovnanie samohlások.',
    tests: [{ name: 'veta', stdin: 'Ahoj svet 25\n' }, { name: 'veľké písmená', stdin: 'PROGRAMOVANIE v C99\n' }],
  },
  {
    id: 'r-slova', cat: 'retazce', level: 2, title: 'Veľké začiatočné písmená',
    statement: 'Načítaj riadok textu (fgets). Zmeň prvé písmeno každého slova na veľké (slová sú oddelené medzerami) a riadok vypíš. Napr. `ahoj  krasny svet` → `Ahoj  Krasny Svet`.',
    starter: `#include <stdio.h>
#include <ctype.h>

int main(void) {

    return 0;
}
`,
    reference: `#include <stdio.h>
#include <ctype.h>
int main(void) {
    char r[202];
    int i, novy = 1;
    if (fgets(r, sizeof r, stdin) == NULL) return 0;
    for (i = 0; r[i] != '\\0'; i++) {
        if (r[i] == ' ' || r[i] == '\\n') novy = 1;
        else {
            if (novy) r[i] = (char)toupper((unsigned char)r[i]);
            novy = 0;
        }
    }
    printf("%s", r);
    return 0;
}`,
    tests: [{ name: 'ukážka', stdin: 'ahoj  krasny svet\n' }, { name: 'už veľké', stdin: 'Uz Je To Tak\n' }],
  },

  // ===================== UKAZOVATELE =====================
  {
    id: 'u-vymen', cat: 'ukazovatele', level: 1, title: 'Výmena cez ukazovatele',
    statement: 'Napíš funkciu `void vymen(int *a, int *b)`, ktorá vymení hodnoty dvoch premenných. Načítaj dve čísla, vymeň ich funkciou a vypíš.',
    starter: `#include <stdio.h>

void vymen(int *a, int *b) {

}

int main(void) {

    return 0;
}
`,
    reference: `#include <stdio.h>
void vymen(int *a, int *b) {
    int t = *a;
    *a = *b;
    *b = t;
}
int main(void) {
    int x, y;
    scanf("%d %d", &x, &y);
    vymen(&x, &y);
    printf("%d %d\\n", x, y);
    return 0;
}`,
    hint: 'Volanie vymen(&x, &y) – odovzdávaš adresy.',
    tests: [{ name: '3 8', stdin: '3 8\n' }, { name: 'záporné', stdin: '-1 0\n' }],
  },
  {
    id: 'u-minmax', cat: 'ukazovatele', level: 2, title: 'Funkcia vracajúca dve hodnoty',
    statement: 'Napíš funkciu `void min_max(int pole[], int n, int *min, int *max)`. Načítaj n a n čísel, zavolaj funkciu a vypíš `min max`.',
    starter: `#include <stdio.h>

void min_max(int pole[], int n, int *min, int *max) {

}

int main(void) {

    return 0;
}
`,
    reference: `#include <stdio.h>
void min_max(int pole[], int n, int *min, int *max) {
    int i;
    *min = *max = pole[0];
    for (i = 1; i < n; i++) {
        if (pole[i] < *min) *min = pole[i];
        if (pole[i] > *max) *max = pole[i];
    }
}
int main(void) {
    int n, i, a[100], mn, mx;
    scanf("%d", &n);
    for (i = 0; i < n; i++) scanf("%d", &a[i]);
    min_max(a, n, &mn, &mx);
    printf("%d %d\\n", mn, mx);
    return 0;
}`,
    tests: [{ name: 'päť čísel', stdin: '5\n4 -2 9 0 3\n' }, { name: 'jedno', stdin: '1\n7\n' }],
  },
  {
    id: 'u-dlzka-ptr', cat: 'ukazovatele', level: 2, title: 'Dĺžka reťazca aritmetikou ukazovateľov',
    statement: 'Napíš funkciu `int dlzka(const char *s)`, ktorá spočíta dĺžku reťazca **posúvaním ukazovateľa** (bez indexov a bez strlen). Pre každé slovo na vstupe vypíš `slovo dlzka`.',
    starter: MAIN,
    reference: `#include <stdio.h>
int dlzka(const char *s) {
    const char *p = s;
    while (*p) p++;
    return (int)(p - s);
}
int main(void) {
    char w[101];
    while (scanf("%100s", w) == 1) printf("%s %d\\n", w, dlzka(w));
    return 0;
}`,
    hint: 'Rozdiel dvoch ukazovateľov do toho istého poľa je počet prvkov medzi nimi.',
    tests: [{ name: 'slová', stdin: 'ahoj ukazovatel x\n' }],
  },
  {
    id: 'u-malloc', cat: 'ukazovatele', level: 2, title: 'Dynamické pole',
    statement: 'Načítaj n (môže byť aj veľké, napr. 100000). Alokuj pole veľkosti n cez `malloc`, načítaj doň n čísel a vypíš ich súčet a druhé najväčšie číslo (ak n = 1, vypíš len súčet). Nakoniec pamäť uvoľni.',
    starter: `#include <stdio.h>
#include <stdlib.h>

int main(void) {

    return 0;
}
`,
    reference: `#include <stdio.h>
#include <stdlib.h>
int main(void) {
    int n, i;
    long long s = 0;
    scanf("%d", &n);
    int *a = malloc(n * sizeof(int));
    if (a == NULL) { printf("Malo pamate\\n"); return 1; }
    for (i = 0; i < n; i++) { scanf("%d", &a[i]); s += a[i]; }
    printf("%lld\\n", s);
    if (n >= 2) {
        int m1 = a[0] > a[1] ? a[0] : a[1], m2 = a[0] > a[1] ? a[1] : a[0];
        for (i = 2; i < n; i++) {
            if (a[i] > m1) { m2 = m1; m1 = a[i]; }
            else if (a[i] > m2) m2 = a[i];
        }
        printf("%d\\n", m2);
    }
    free(a);
    return 0;
}`,
    tests: [{ name: 'malé', stdin: '5\n3 9 1 9 4\n' }, { name: 'jedno', stdin: '1\n5\n' }, { name: 'veľké n', stdin: '20000\n' + Array.from({ length: 20000 }, (_, i) => (i * 7919) % 10007).join(' ') + '\n' }],
  },

  // ===================== NÁJDI CHYBU =====================
  {
    id: 'b-scanf', cat: 'chyby', level: 1, title: 'Program padá pri načítaní',
    statement: 'Program má načítať dve čísla a vypísať ich súčin, ale padá. Nájdi a oprav chybu.',
    starter: `#include <stdio.h>

int main(void) {
    int a, b;
    scanf("%d %d", a, b);
    printf("%d\\n", a * b);
    return 0;
}
`,
    reference: `#include <stdio.h>
int main(void) {
    int a, b;
    scanf("%d %d", &a, &b);
    printf("%d\\n", a * b);
    return 0;
}`,
    hint: 'scanf potrebuje adresu premennej.',
    tests: [{ name: '6 7', stdin: '6 7\n' }, { name: 'záporné', stdin: '-3 4\n' }],
  },
  {
    id: 'b-podmienka', cat: 'chyby', level: 1, title: 'Vždy rovnaká odpoveď',
    statement: 'Program má vypísať `rovne`, ak sa čísla rovnajú, inak `rozne`. Vždy však vypíše to isté. Oprav ho.',
    starter: `#include <stdio.h>

int main(void) {
    int a, b;
    scanf("%d %d", &a, &b);
    if (a = b)
        printf("rovne\\n");
    else
        printf("rozne\\n");
    return 0;
}
`,
    reference: `#include <stdio.h>
int main(void) {
    int a, b;
    scanf("%d %d", &a, &b);
    if (a == b) printf("rovne\\n");
    else printf("rozne\\n");
    return 0;
}`,
    hint: '= je priradenie, == je porovnanie. Kompilátor na to často upozorní.',
    tests: [{ name: 'rovnaké', stdin: '5 5\n' }, { name: 'rôzne', stdin: '5 3\n' }, { name: 'b = 0', stdin: '4 0\n' }],
  },
  {
    id: 'b-pole', cat: 'chyby', level: 2, title: 'Divný súčet poľa',
    statement: 'Program má sčítať 5 čísel zo vstupu, ale niekedy dá nezmysel alebo spadne. Nájdi chybu (aj sanitizér ti napovie).',
    starter: `#include <stdio.h>

int main(void) {
    int a[5], i, sucet;
    for (i = 0; i <= 5; i++)
        scanf("%d", &a[i]);
    for (i = 0; i <= 5; i++)
        sucet += a[i];
    printf("%d\\n", sucet);
    return 0;
}
`,
    reference: `#include <stdio.h>
int main(void) {
    int a[5], i, sucet = 0;
    for (i = 0; i < 5; i++) scanf("%d", &a[i]);
    for (i = 0; i < 5; i++) sucet += a[i];
    printf("%d\\n", sucet);
    return 0;
}`,
    hint: 'Sú tam dve chyby: hranica cyklu a neinicializovaná premenná.',
    tests: [{ name: '1 až 5', stdin: '1 2 3 4 5\n' }, { name: 'nuly', stdin: '0 0 0 0 0\n' }],
  },
  {
    id: 'b-priemer', cat: 'chyby', level: 1, title: 'Zlý priemer',
    statement: 'Program má vypísať priemer dvoch celých čísel na 1 desatinné miesto (pre 3 a 4 → 3.5), ale vypisuje 3.0. Oprav ho.',
    starter: `#include <stdio.h>

int main(void) {
    int a, b;
    double p;
    scanf("%d %d", &a, &b);
    p = (a + b) / 2;
    printf("%.1f\\n", p);
    return 0;
}
`,
    reference: `#include <stdio.h>
int main(void) {
    int a, b;
    double p;
    scanf("%d %d", &a, &b);
    p = (a + b) / 2.0;
    printf("%.1f\\n", p);
    return 0;
}`,
    hint: 'int / int je celočíselné delenie, aj keď výsledok ukladáš do double.',
    tests: [{ name: '3 4', stdin: '3 4\n' }, { name: '10 11', stdin: '10 11\n' }],
  },
  {
    id: 'b-subor', cat: 'chyby', level: 2, title: 'Počítanie znakov sa nezastaví',
    statement: 'Program má spočítať znaky súboru `data.txt`, ale na niektorých systémoch nikdy neskončí alebo skončí predčasne. Oprav ho.',
    starter: `#include <stdio.h>

int main(void) {
    FILE *f = fopen("data.txt", "r");
    char c;
    int n = 0;
    while ((c = getc(f)) != EOF)
        n++;
    printf("%d\\n", n);
    return 0;
}
`,
    reference: `#include <stdio.h>
int main(void) {
    FILE *f = fopen("data.txt", "r");
    int c, n = 0;
    if (f == NULL) { printf("Chyba\\n"); return 0; }
    while ((c = getc(f)) != EOF) n++;
    fclose(f);
    printf("%d\\n", n);
    return 0;
}`,
    hint: 'getc vracia int (EOF je -1). Chýba aj kontrola NULL a fclose.',
    tests: [{ name: 'text', filesIn: { 'data.txt': 'abc\nde\n' } }, { name: 'bajt 0xFF v súbore', filesIn: { 'data.txt': { b64: 'Yf9iCg==' } } }, { name: 'súbor chýba', filesIn: {} }],
  },
];

// ---------- „Čo vypíše program?“ ----------
// Výstup vypočíta build skript skutočným spustením; explain = stručné vysvetlenie.
export const PREDICT = [
  { id: 'q-int-delenie', topic: 'operátory', code: `int a = 7, b = 2;\nprintf("%d %d %.1f\\n", a / b, a % b, a / b * 1.0);`,
    explain: '7 / 2 je celočíselné delenie = 3, zvyšok 7 % 2 = 1. Vo výraze a / b * 1.0 sa najprv vypočíta a / b = 3 a až potom sa násobí 1.0 → 3.0.' },
  { id: 'q-inkrement', topic: 'operátory', code: `int i = 5;\nint a = i++;\nint b = ++i;\nprintf("%d %d %d\\n", a, b, i);`,
    explain: 'i++ vráti starú hodnotu (a = 5) a potom zvýši i na 6. ++i najprv zvýši i na 7 a vráti novú hodnotu (b = 7).' },
  { id: 'q-formaty', topic: 'printf', code: `printf("[%5d][%-5d][%05d]\\n", 42, 42, 42);`,
    explain: '%5d zarovná doprava na šírku 5, %-5d doľava, %05d doplní zľava nulami.' },
  { id: 'q-float', topic: 'printf', code: `double x = 2.0 / 3;\nprintf("%.2f %.0f %f\\n", x, x, x);`,
    explain: '%.2f zaokrúhli na 2 miesta (0.67), %.0f na celé číslo (1), %f vypíše predvolene 6 desatinných miest.' },
  { id: 'q-char', topic: 'znaky', code: `char c = 'A' + 2;\nprintf("%c %d %c\\n", c, c, c + 32);`,
    explain: "'A' má kód 65, takže c = 67 = 'C'. Malé písmená sú o 32 ďalej: 99 = 'c'." },
  { id: 'q-for', topic: 'cykly', code: `int i, s = 0;\nfor (i = 1; i < 10; i += 3) s += i;\nprintf("%d %d\\n", s, i);`,
    explain: 'i nadobúda 1, 4, 7 → s = 12. Potom i = 10, podmienka neplatí a cyklus skončí, i ostane 10.' },
  { id: 'q-while-break', topic: 'cykly', code: `int n = 0;\nwhile (1) {\n    n++;\n    if (n % 2 == 0) continue;\n    if (n > 6) break;\n    printf("%d ", n);\n}\nprintf("| %d\\n", n);`,
    explain: 'Párne n preskočí continue. Vypíšu sa 1, 3, 5. Pri n = 7 je n > 6 a break ukončí cyklus.' },
  { id: 'q-do-while', topic: 'cykly', code: `int k = 10;\ndo {\n    printf("%d ", k);\n    k -= 4;\n} while (k > 5);\nprintf("\\n");`,
    explain: 'do-while vykoná telo aspoň raz: vypíše 10, k = 6 (> 5, pokračuje), vypíše 6, k = 2 a skončí. Za 6 ostane medzera.' },
  { id: 'q-switch', topic: 'switch', code: `int x = 2;\nswitch (x) {\n    case 1: printf("A");\n    case 2: printf("B");\n    case 3: printf("C");\n    default: printf("D");\n}\nprintf("\\n");`,
    explain: 'Bez break vykonávanie „prepadne“ do ďalších vetiev: od case 2 sa vypíše B, C aj D.' },
  { id: 'q-skrat', topic: 'logika', code: `int a = 0, b = 5;\nif (a != 0 && b / a > 1) printf("ano\\n");\nelse printf("nie\\n");\nprintf("%d %d\\n", a || b, !b);`,
    explain: 'Pri && sa pravá strana nevyhodnotí, ak je ľavá nepravdivá (skrátené vyhodnotenie), takže k deleniu nulou nedôjde. a || b = 1, !5 = 0.' },
  { id: 'q-ternar', topic: 'operátory', code: `int x = -3;\nprintf("%d %s\\n", x < 0 ? -x : x, x % 2 ? "neparne" : "parne");`,
    explain: 'Ternárny operátor vyberie -x = 3. -3 % 2 = -1, čo je nenulové, teda pravda → "neparne".' },
  { id: 'q-vnorene', topic: 'cykly', code: `int i, j;\nfor (i = 1; i <= 3; i++) {\n    for (j = 1; j <= i; j++) printf("%d", j);\n    printf(" ");\n}\nprintf("\\n");`,
    explain: 'Vnútorný cyklus ide po i: 1, 12, 123. Za každou skupinou je medzera.' },
  { id: 'q-pole', topic: 'polia', code: `int a[5] = {3, 1, 4};\nint i, s = 0;\nfor (i = 0; i < 5; i++) s += a[i];\nprintf("%d %d\\n", s, a[4]);`,
    explain: 'Pri čiastočnej inicializácii sa zvyšné prvky nastavia na 0: {3, 1, 4, 0, 0}.' },
  { id: 'q-retazec', topic: 'reťazce', code: `char s[] = "ahoj";\ns[0] = 'A';\nprintf("%s %d %c\\n", s, (int)sizeof(s), s[3]);`,
    explain: 'Pole má 5 bajtov: 4 znaky + ukončovací \'\\0\'. s[3] je \'j\'.' },
  { id: 'q-ukazovatel', topic: 'ukazovatele', code: `int x = 10, *p = &x;\n*p = *p + 5;\np = NULL;\nprintf("%d\\n", x);`,
    explain: '*p je samotné x, takže x = 15. Zmena p na NULL premennú x neovplyvní.' },
  { id: 'q-funkcia-hodnota', topic: 'funkcie', code: `void zmen(int a) { a = 100; }\n/*MAIN*/\nint x = 1;\nzmen(x);\nprintf("%d\\n", x);`, wrapFn: true,
    explain: 'Parameter sa odovzdáva hodnotou – funkcia mení iba svoju kópiu.' },
  { id: 'q-funkcia-odkaz', topic: 'funkcie', code: `void zmen(int *a) { *a = 100; }\n/*MAIN*/\nint x = 1;\nzmen(&x);\nprintf("%d\\n", x);`, wrapFn: true,
    explain: 'Funkcia dostane adresu x a cez *a zapíše priamo do x.' },
  { id: 'q-rekurzia', topic: 'funkcie', code: `int f(int n) { return n <= 1 ? 1 : n * f(n - 2); }\n/*MAIN*/\nprintf("%d %d\\n", f(5), f(6));`, wrapFn: true,
    explain: 'f(5) = 5·3·f(1) = 15, f(6) = 6·4·2·f(0) = 48.' },
  { id: 'q-static', topic: 'funkcie', code: `int pocitadlo(void) { static int n = 0; return ++n; }\n/*MAIN*/\npocitadlo(); pocitadlo();\nprintf("%d\\n", pocitadlo());`, wrapFn: true,
    explain: 'static premenná si hodnotu pamätá medzi volaniami a inicializuje sa iba raz. Tretie volanie vráti 3.' },
  { id: 'q-pretypovanie', topic: 'typová konverzia', code: `int a = 5;\ndouble d = 9.99;\nprintf("%d %d %.2f\\n", (int)d, a / 2, (double)a / 2);`,
    explain: '(int) desatinnú časť odreže (nezaokrúhľuje) → 9. a / 2 je celočíselné → 2. (double)a / 2 = 2.5.' },
  { id: 'q-zatvorky', topic: 'operátory', code: `int x = 2 + 3 * 4 % 5;\nint y = (2 + 3) * 4 % 5;\nprintf("%d %d\\n", x, y);`,
    explain: '* a % majú rovnakú prioritu a vyhodnocujú sa zľava: 3 * 4 = 12, 12 % 5 = 2, 2 + 2 = 4. V druhom: 5 * 4 = 20, 20 % 5 = 0.' },
  { id: 'q-unsigned', topic: 'dátové typy', code: `unsigned char c = 250;\nc = c + 10;\nprintf("%d\\n", c);`,
    explain: 'unsigned char má rozsah 0–255. 260 sa uloží modulo 256 → 4.' },
  { id: 'q-scanf-navrat', topic: 'vstup', stdin: '12 abc', code: `int a = 0, b = 0;\nint r = scanf("%d %d", &a, &b);\nprintf("%d %d %d\\n", r, a, b);`,
    explain: 'Vstup je „12 abc“. scanf vráti počet úspešne načítaných položiek: 12 sa načíta, „abc“ nie je číslo → r = 1, b ostane 0.' },
  { id: 'q-sizeof', topic: 'dátové typy', code: `int a[10];\nprintf("%d %d\\n", (int)sizeof(a), (int)(sizeof(a) / sizeof(a[0])));`,
    explain: 'int má 4 bajty, pole 10 intov 40 bajtov. sizeof(a) / sizeof(a[0]) = počet prvkov.' },
  { id: 'q-ukazovatel-pole', topic: 'ukazovatele', code: `int a[] = {10, 20, 30, 40};\nint *p = a + 1;\nprintf("%d %d %d\\n", *p, *(p + 2), p[1]);`,
    explain: 'p ukazuje na a[1] = 20. *(p + 2) = a[3] = 40, p[1] = a[2] = 30.' },
  { id: 'q-for-strednik', topic: 'cykly', code: `int i, s = 0;\nfor (i = 0; i < 5; i++);\n    s += i;\nprintf("%d %d\\n", i, s);`,
    explain: 'Bodkočiarka za for je prázdne telo cyklu. Riadok s += i sa vykoná iba raz, keď je i = 5.' },
];

// úlohy a otázky na cykly (príprava na test T1) sú v samostatnom súbore
TASKS.push(...CYKLY_TASKS);
PREDICT.push(...CYKLY_PREDICT);
