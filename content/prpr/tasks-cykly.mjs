// Ďalšie úlohy na cykly (príprava na počítačový test T1 z PrPr – téma cykly).
// Štýl ako na cvičení CV03: presný formát výstupu, vnorené cykly, while/do-while, priebežný výpočet.

const MAIN = `#include <stdio.h>

int main(void) {

    return 0;
}
`;

export const CYKLY_TASKS = [
  // ---------- úroveň 1 ----------
  {
    id: 'c-nasobilka', cat: 'cykly', level: 1, title: 'Tabuľka násobilky',
    statement: 'Načítaj n (1–12). Vypíš tabuľku násobilky n × n: v riadku i sú čísla i·1, i·2, …, i·n, každé na šírku 4 znakov (`%4d`).\n```\nvstup: 3\n   1   2   3\n   2   4   6\n   3   6   9\n```',
    starter: MAIN,
    reference: `#include <stdio.h>
int main(void) {
    int n, i, j;
    scanf("%d", &n);
    for (i = 1; i <= n; i++) {
        for (j = 1; j <= n; j++)
            printf("%4d", i * j);
        printf("\\n");
    }
    return 0;
}`,
    hint: 'Vonkajší cyklus = riadky, vnútorný = stĺpce. `\\n` patrí až za vnútorný cyklus.',
    tests: [{ name: 'n = 3', stdin: '3\n' }, { name: 'n = 1', stdin: '1\n' }, { name: 'n = 12', stdin: '12\n' }],
  },
  {
    id: 'c-cifry', cat: 'cykly', level: 1, title: 'Počet cifier a ciferný súčet',
    statement: 'Načítaj nezáporné celé číslo (typ `long`). Vypíš počet jeho cifier a ciferný súčet. Číslo 0 má jednu cifru.\n```\nvstup: 1234\nPocet cifier: 4\nCiferny sucet: 10\n```',
    starter: MAIN,
    reference: `#include <stdio.h>
int main(void) {
    long x;
    int pocet = 0, sucet = 0;
    scanf("%ld", &x);
    do {
        sucet += x % 10;
        pocet++;
        x /= 10;
    } while (x > 0);
    printf("Pocet cifier: %d\\nCiferny sucet: %d\\n", pocet, sucet);
    return 0;
}`,
    hint: 'Posledná cifra je `x % 10`, odrežeš ju `x / 10`. S `do-while` sa správne spočíta aj nula (telo prebehne aspoň raz).',
    tests: [{ name: '1234', stdin: '1234\n' }, { name: 'nula', stdin: '0\n' }, { name: 'nuly vnútri', stdin: '9070605\n' }, { name: 'veľké číslo', stdin: '999999999999\n' }],
  },
  {
    id: 'c-nula-koniec', cat: 'cykly', level: 1, title: 'Čítanie až po nulu',
    statement: 'Načítavaj celé čísla, kým nepríde **0** (nula sa už nespracuje, čísla za ňou sa ignorujú). Vypíš súčet kladných čísel, počet záporných a priemer všetkých spracovaných čísel na 2 desatinné miesta:\n```\nvstup: 5 -3 7 -1 2 0\nSucet kladnych: 14\nPocet zapornych: 2\nPriemer: 2.00\n```\nAk je prvé číslo 0, vypíš iba `Ziadne cisla`.',
    starter: MAIN,
    reference: `#include <stdio.h>
int main(void) {
    int x, kladne = 0, zaporne = 0, pocet = 0, sucet = 0;
    while (scanf("%d", &x) == 1 && x != 0) {
        if (x > 0)
            kladne += x;
        else
            zaporne++;
        sucet += x;
        pocet++;
    }
    if (pocet == 0)
        printf("Ziadne cisla\\n");
    else
        printf("Sucet kladnych: %d\\nPocet zapornych: %d\\nPriemer: %.2f\\n", kladne, zaporne, (double)sucet / pocet);
    return 0;
}`,
    hint: 'Podmienka cyklu môže byť `while (scanf(...) == 1 && x != 0)`. Pri priemere pozor na celočíselné delenie – pretypuj `(double)sucet / pocet`.',
    tests: [{ name: 'ukážka', stdin: '5 -3 7 -1 2 0\n' }, { name: 'hneď nula', stdin: '0\n' }, { name: 'čísla za nulou', stdin: '-4 -6 0 8 9\n' }, { name: 'na riadkoch', stdin: '10\n20\n30\n0\n' }],
  },
  {
    id: 'c-mocniny-dvoch', cat: 'cykly', level: 1, title: 'Mocniny dvojky',
    statement: 'Načítaj kladné celé číslo n (najviac 10⁹). Vypíš všetky mocniny čísla 2, ktoré sú **menšie alebo rovné n**, od 1 vzostupne, oddelené medzerou.\n```\nvstup: 20\n1 2 4 8 16\n```',
    starter: MAIN,
    reference: `#include <stdio.h>
int main(void) {
    int n;
    long long p;
    scanf("%d", &n);
    printf("1");
    for (p = 2; p <= n; p *= 2)
        printf(" %lld", p);
    printf("\\n");
    return 0;
}`,
    hint: 'Krok cyklu nemusí byť `i++` – môže byť `p *= 2`. Pri n blízko 10⁹ by `int p` po vynásobení pretiekol, preto `long long`.',
    tests: [{ name: 'n = 20', stdin: '20\n' }, { name: 'n = 1', stdin: '1\n' }, { name: 'presne mocnina', stdin: '1024\n' }, { name: 'veľké n', stdin: '1000000000\n' }],
  },
  {
    id: 'c-floyd', cat: 'cykly', level: 1, title: 'Floydov trojuholník',
    statement: 'Načítaj n (1–15). Vypíš n riadkov, v riadku i je i po sebe idúcich čísel, začína sa od 1 a pokračuje sa ďalej. Každé číslo na šírku 4 znakov.\n```\nvstup: 4\n   1\n   2   3\n   4   5   6\n   7   8   9  10\n```',
    starter: MAIN,
    reference: `#include <stdio.h>
int main(void) {
    int n, i, j, k = 1;
    scanf("%d", &n);
    for (i = 1; i <= n; i++) {
        for (j = 1; j <= i; j++) {
            printf("%4d", k);
            k++;
        }
        printf("\\n");
    }
    return 0;
}`,
    hint: 'Okrem riadiacich premenných i, j potrebuješ tretiu premennú, ktorá sa zvyšuje stále – aj cez riadky.',
    tests: [{ name: 'n = 4', stdin: '4\n' }, { name: 'n = 1', stdin: '1\n' }, { name: 'n = 7', stdin: '7\n' }],
  },
  {
    id: 'c-interval-dowhile', cat: 'cykly', level: 1, title: 'Opakuj, kým nie je v intervale',
    statement: 'Načítavaj celé čísla, kým nepríde číslo z intervalu ⟨1, 10⟩. Za každé číslo mimo intervalu vypíš `Mimo intervalu`. Pre prvé vyhovujúce číslo k vypíš jeho násobky k, 2k, …, 10k oddelené medzerou. Použi **do-while**.\n```\nvstup: 15 -2 7\nMimo intervalu\nMimo intervalu\n7 14 21 28 35 42 49 56 63 70\n```',
    starter: MAIN,
    reference: `#include <stdio.h>
int main(void) {
    int k, i;
    do {
        if (scanf("%d", &k) != 1)
            return 0;
        if (k < 1 || k > 10)
            printf("Mimo intervalu\\n");
    } while (k < 1 || k > 10);
    printf("%d", k);
    for (i = 2; i <= 10; i++)
        printf(" %d", i * k);
    printf("\\n");
    return 0;
}`,
    hint: 'Ako úloha 3.2: `do { načítaj } while (číslo je zlé);`. Interval ⟨1, 10⟩ je mimo, keď `k < 1 || k > 10`.',
    tests: [{ name: 'ukážka', stdin: '15 -2 7\n' }, { name: 'hneď dobré', stdin: '3\n' }, { name: 'hranice', stdin: '0 11 100 10\n' }],
  },
  {
    id: 'c-harmonicky', cat: 'cykly', level: 1, title: 'Súčet radu 1 + 1/2 + … + 1/n',
    statement: 'Načítaj kladné celé číslo n. Vypíš súčet 1 + 1/2 + 1/3 + … + 1/n na 4 desatinné miesta.\n```\nvstup: 2\n1.5000\n```',
    starter: MAIN,
    reference: `#include <stdio.h>
int main(void) {
    int n, i;
    double s = 0;
    scanf("%d", &n);
    for (i = 1; i <= n; i++)
        s += 1.0 / i;
    printf("%.4f\\n", s);
    return 0;
}`,
    hint: '`1 / i` je pre i > 1 vždy 0 (celočíselné delenie). Treba `1.0 / i`.',
    tests: [{ name: 'n = 2', stdin: '2\n' }, { name: 'n = 1', stdin: '1\n' }, { name: 'n = 10', stdin: '10\n' }, { name: 'n = 1000', stdin: '1000\n' }],
  },

  // ---------- úroveň 2 ----------
  {
    id: 'c-ram', cat: 'cykly', level: 2, title: 'Štvorec s rámom',
    statement: 'Načítaj n (2–20). Vykresli štvorec n × n, ktorého okraj je zo znakov `#` a vnútro zo znakov `.`.\n```\nvstup: 4\n####\n#..#\n#..#\n####\n```',
    starter: MAIN,
    reference: `#include <stdio.h>
int main(void) {
    int n, r, s;
    scanf("%d", &n);
    for (r = 0; r < n; r++) {
        for (s = 0; s < n; s++) {
            if (r == 0 || r == n - 1 || s == 0 || s == n - 1)
                printf("#");
            else
                printf(".");
        }
        printf("\\n");
    }
    return 0;
}`,
    hint: 'Pre každé políčko (riadok r, stĺpec s) rozhodni podmienkou: je na okraji? Okraj = prvý/posledný riadok alebo prvý/posledný stĺpec.',
    tests: [{ name: 'n = 4', stdin: '4\n' }, { name: 'n = 2', stdin: '2\n' }, { name: 'n = 6', stdin: '6\n' }],
  },
  {
    id: 'c-sachovnica', cat: 'cykly', level: 2, title: 'Šachovnica',
    statement: 'Načítaj n (1–20). Vypíš šachovnicu n × n zo znakov `X` a `O`: ľavý horný roh je `X` a susedné políčka (vodorovne aj zvisle) sa striedajú.\n```\nvstup: 3\nXOX\nOXO\nXOX\n```',
    starter: MAIN,
    reference: `#include <stdio.h>
int main(void) {
    int n, r, s;
    scanf("%d", &n);
    for (r = 0; r < n; r++) {
        for (s = 0; s < n; s++) {
            if ((r + s) % 2 == 0)
                printf("X");
            else
                printf("O");
        }
        printf("\\n");
    }
    return 0;
}`,
    hint: 'Pozri sa na súčet riadku a stĺpca: na X je vždy párny.',
    tests: [{ name: 'n = 3', stdin: '3\n' }, { name: 'n = 1', stdin: '1\n' }, { name: 'n = 4', stdin: '4\n' }],
  },
  {
    id: 'c-pyramida-cisel', cat: 'cykly', level: 2, title: 'Pyramída čísel',
    statement: 'Načítaj n (1–9). Riadok i (od 1) obsahuje n − i medzier a potom čísla 1, 2, …, i, …, 2, 1 bez medzier. Za posledným číslom už nič.\n```\nvstup: 4\n   1\n  121\n 12321\n1234321\n```',
    starter: MAIN,
    reference: `#include <stdio.h>
int main(void) {
    int n, i, j;
    scanf("%d", &n);
    for (i = 1; i <= n; i++) {
        for (j = 0; j < n - i; j++)
            printf(" ");
        for (j = 1; j <= i; j++)
            printf("%d", j);
        for (j = i - 1; j >= 1; j--)
            printf("%d", j);
        printf("\\n");
    }
    return 0;
}`,
    hint: 'V riadku sú tri vnútorné cykly za sebou: medzery, čísla nahor, čísla nadol (od i − 1).',
    tests: [{ name: 'n = 4', stdin: '4\n' }, { name: 'n = 1', stdin: '1\n' }, { name: 'n = 9', stdin: '9\n' }],
  },
  {
    id: 'c-binarne', cat: 'cykly', level: 2, title: 'Dvojková sústava bez poľa',
    statement: 'Načítaj nezáporné celé číslo n (najviac 10⁹) a vypíš ho v dvojkovej sústave bez úvodných núl (0 → `0`). **Nepoužívaj pole.**\n```\nvstup: 10\n1010\n```',
    starter: MAIN,
    reference: `#include <stdio.h>
int main(void) {
    int n;
    long long p = 1;
    scanf("%d", &n);
    while (p * 2 <= n)
        p *= 2;
    for (; p >= 1; p /= 2) {
        if (n >= p) {
            printf("1");
            n -= p;
        } else
            printf("0");
    }
    printf("\\n");
    return 0;
}`,
    hint: 'Zvyšky po delení 2 vychádzajú odzadu. Bez poľa to otočíš tak, že najprv nájdeš najväčšiu mocninu 2, ktorá je ≤ n, a potom ideš od nej nadol: ak sa zmestí, vypíš 1 a odčítaj ju, inak 0.',
    tests: [{ name: '10', stdin: '10\n' }, { name: '0', stdin: '0\n' }, { name: '1', stdin: '1\n' }, { name: '255', stdin: '255\n' }, { name: 'veľké', stdin: '1000000000\n' }],
  },
  {
    id: 'c-dokonale', cat: 'cykly', level: 2, title: 'Dokonalé čísla',
    statement: 'Číslo je **dokonalé**, ak sa rovná súčtu svojich deliteľov menších ako ono samo (6 = 1 + 2 + 3). Načítaj a, b (1 ≤ a ≤ b ≤ 10000) a vypíš každé dokonalé číslo z ⟨a, b⟩ na samostatný riadok v tvare:\n```\n6 = 1 + 2 + 3\n```\nAk tam žiadne nie je, vypíš `Ziadne dokonale cislo`.',
    starter: MAIN,
    reference: `#include <stdio.h>
int main(void) {
    int a, b, n, d, sucet, nasiel = 0;
    scanf("%d %d", &a, &b);
    for (n = a; n <= b; n++) {
        sucet = 0;
        for (d = 1; d < n; d++)
            if (n % d == 0)
                sucet += d;
        if (n > 1 && sucet == n) {
            printf("%d = 1", n);
            for (d = 2; d < n; d++)
                if (n % d == 0)
                    printf(" + %d", d);
            printf("\\n");
            nasiel = 1;
        }
    }
    if (!nasiel)
        printf("Ziadne dokonale cislo\\n");
    return 0;
}`,
    hint: 'Vonkajší cyklus cez čísla, vnútorný cez kandidátov na deliteľa. Delitele sa vypíšu druhým prechodom, až keď vieš, že číslo je dokonalé. Pozor: 1 nie je dokonalé (súčet je 0).',
    tests: [{ name: '1 30', stdin: '1 30\n' }, { name: '1 500', stdin: '1 500\n' }, { name: 'žiadne', stdin: '30 400\n' }, { name: '8128', stdin: '8000 8200\n' }],
  },
  {
    id: 'c-collatz', cat: 'cykly', level: 2, title: 'Collatzova postupnosť',
    statement: 'Načítaj kladné celé číslo n. Kým n nie je 1: ak je párne, vydeľ ho 2, inak n = 3n + 1. Vypíš celú postupnosť oddelenú medzerami (s počiatočným n aj s poslednou 1) a na ďalší riadok počet krokov.\n```\nvstup: 6\n6 3 10 5 16 8 4 2 1\nKroky: 8\n```',
    starter: MAIN,
    reference: `#include <stdio.h>
int main(void) {
    long long n;
    int kroky = 0;
    scanf("%lld", &n);
    printf("%lld", n);
    while (n != 1) {
        if (n % 2 == 0)
            n = n / 2;
        else
            n = 3 * n + 1;
        printf(" %lld", n);
        kroky++;
    }
    printf("\\nKroky: %d\\n", kroky);
    return 0;
}`,
    hint: 'Typický `while` – vopred nevieš, koľko krokov bude. Hodnoty môžu byť veľké, `long long` je bezpečnejší.',
    tests: [{ name: 'n = 6', stdin: '6\n' }, { name: 'n = 1', stdin: '1\n' }, { name: 'n = 27', stdin: '27\n' }, { name: 'n = 97', stdin: '97\n' }],
  },
  {
    id: 'c-pi', cat: 'cykly', level: 2, title: 'Približná hodnota π',
    statement: 'Načítaj n (1–1 000 000). Spočítaj prvých n členov radu 1 − 1/3 + 1/5 − 1/7 + … a výsledok vynásobený 4 vypíš na 6 desatinných miest.\n```\nvstup: 2\n2.666667\n```',
    starter: MAIN,
    reference: `#include <stdio.h>
int main(void) {
    int n, i;
    double s = 0, znamienko = 1;
    scanf("%d", &n);
    for (i = 0; i < n; i++) {
        s += znamienko / (2 * i + 1);
        znamienko = -znamienko;
    }
    printf("%.6f\\n", 4 * s);
    return 0;
}`,
    hint: 'Menovateľ i-teho člena je 2i + 1, znamienko sa v každom kroku otočí (premenná, ktorú násobíš −1).',
    tests: [{ name: 'n = 1', stdin: '1\n' }, { name: 'n = 2', stdin: '2\n' }, { name: 'n = 10', stdin: '10\n' }, { name: 'n = 1000', stdin: '1000\n' }, { name: 'n = 1000000', stdin: '1000000\n' }],
  },
  {
    id: 'c-tabulka-funkcie', cat: 'cykly', level: 2, title: 'Tabuľka hodnôt funkcie',
    statement: 'Napíš funkciu `double f(double x)`, ktorá vráti x² − 2x + 1. Načítaj reálne čísla a, b (a < b) a celé n (≥ 1). Vypíš hodnoty v n + 1 bodoch x = a + i·(b − a)/n pre i = 0, 1, …, n:\n```\nvstup: 0 2 4\nx = 0.000, f(x) = 1.000\nx = 0.500, f(x) = 0.250\nx = 1.000, f(x) = 0.000\nx = 1.500, f(x) = 0.250\nx = 2.000, f(x) = 1.000\n```',
    starter: `#include <stdio.h>

double f(double x) {

}

int main(void) {

    return 0;
}
`,
    reference: `#include <stdio.h>
double f(double x) {
    return x * x - 2 * x + 1;
}
int main(void) {
    double a, b, x;
    int n, i;
    scanf("%lf %lf %d", &a, &b, &n);
    for (i = 0; i <= n; i++) {
        x = a + i * (b - a) / n;
        printf("x = %.3f, f(x) = %.3f\\n", x, f(x));
    }
    return 0;
}`,
    hint: 'Bodov je n + 1 (aj krajné). x počítaj vždy znova z i – sčítavanie kroku x += h môže nazbierať chybu zaokrúhlenia.',
    tests: [{ name: 'ukážka', stdin: '0 2 4\n' }, { name: 'záporné a', stdin: '-1 3 4\n' }, { name: 'n = 1', stdin: '0.5 1.5 1\n' }],
  },

  // ---------- úroveň 3 ----------
  {
    id: 'c-najdlhsia', cat: 'cykly', level: 3, title: 'Najdlhší rastúci úsek',
    statement: 'Na vstupe je neznámy počet celých čísel. Vypíš dĺžku najdlhšieho úseku **za sebou idúcich** čísel, ktoré **ostro rastú**. Pri prázdnom vstupe vypíš 0.\n```\nvstup: 1 2 5 3 4 6 8 2\n4\n```\n(úsek 3 4 6 8)',
    starter: MAIN,
    reference: `#include <stdio.h>
int main(void) {
    int x, pred = 0, dlzka = 0, max = 0;
    while (scanf("%d", &x) == 1) {
        if (dlzka > 0 && x > pred)
            dlzka++;
        else
            dlzka = 1;
        if (dlzka > max)
            max = dlzka;
        pred = x;
    }
    printf("%d\\n", max);
    return 0;
}`,
    hint: 'Pamätaj si predchádzajúce číslo a dĺžku aktuálneho úseku. Keď nové číslo nie je väčšie, úsek sa začína odznova (dĺžka 1).',
    tests: [{ name: 'ukážka', stdin: '1 2 5 3 4 6 8 2\n' }, { name: 'prázdny vstup', stdin: '' }, { name: 'jedno číslo', stdin: '7\n' }, { name: 'klesajúce', stdin: '5 4 3 2 1\n' }, { name: 'rovnaké', stdin: '2 2 2\n' }, { name: 'celé rastie', stdin: '1 2 3 4 5\n' }],
  },
  {
    id: 'c-kosostvorec', cat: 'cykly', level: 3, title: 'Kosoštvorec',
    statement: 'Načítaj nepárne n (1–19). Vykresli kosoštvorec z `*` s výškou aj šírkou n. Za poslednou hviezdičkou v riadku nevypisuj medzery.\n```\nvstup: 5\n  *\n ***\n*****\n ***\n  *\n```',
    starter: MAIN,
    reference: `#include <stdio.h>
int main(void) {
    int n, r, j, stred, d;
    scanf("%d", &n);
    stred = n / 2;
    for (r = 0; r < n; r++) {
        d = r < stred ? stred - r : r - stred;   /* vzdialenosť od stredného riadku */
        for (j = 0; j < d; j++)
            printf(" ");
        for (j = 0; j < n - 2 * d; j++)
            printf("*");
        printf("\\n");
    }
    return 0;
}`,
    hint: 'Pre riadok r spočítaj jeho vzdialenosť d od stredného riadku. Medzier je d, hviezdičiek n − 2d. Horná a dolná polovica sú potom jeden cyklus.',
    tests: [{ name: 'n = 5', stdin: '5\n' }, { name: 'n = 1', stdin: '1\n' }, { name: 'n = 9', stdin: '9\n' }],
  },
  {
    id: 'c-pismeno-z', cat: 'cykly', level: 3, title: 'Písmeno Z',
    statement: 'Načítaj n (3–20). Vykresli písmeno Z v štvorci n × n: prvý a posledný riadok sú celé z `*`, v riadkoch medzi nimi je jediná `*` na vedľajšej diagonále (pred ňou medzery, za ňou nič).\n```\nvstup: 4\n****\n  *\n *\n****\n```',
    starter: MAIN,
    reference: `#include <stdio.h>
int main(void) {
    int n, r, j;
    scanf("%d", &n);
    for (r = 0; r < n; r++) {
        if (r == 0 || r == n - 1) {
            for (j = 0; j < n; j++)
                printf("*");
        } else {
            for (j = 0; j < n - 1 - r; j++)
                printf(" ");
            printf("*");
        }
        printf("\\n");
    }
    return 0;
}`,
    hint: 'Vedľajšia diagonála: stĺpec s = n − 1 − r. Pred hviezdičkou je teda n − 1 − r medzier.',
    tests: [{ name: 'n = 4', stdin: '4\n' }, { name: 'n = 3', stdin: '3\n' }, { name: 'n = 6', stdin: '6\n' }],
  },
];

export const CYKLY_PREDICT = [
  { id: 'q-for-krok', topic: 'cykly', code: `int i;\nfor (i = 10; i > 0; i -= 3)\n    printf("%d ", i);\nprintf("\\n");`,
    explain: 'i = 10, 7, 4, 1. Potom i = −2 a podmienka i > 0 neplatí. Za 1 ostane medzera.' },
  { id: 'q-while-nasob', topic: 'cykly', code: `int n = 1;\nwhile (n < 50)\n    n *= 3;\nprintf("%d\\n", n);`,
    explain: 'n = 1, 3, 9, 27, 81. Pri 81 už n < 50 neplatí, takže sa vypíše 81 (prvá hodnota, ktorá podmienku porušila).' },
  { id: 'q-dowhile-raz', topic: 'cykly', code: `int i = 5;\ndo {\n    printf("%d ", i);\n    i++;\n} while (i < 5);\nprintf("| %d\\n", i);`,
    explain: 'do-while vykoná telo aspoň raz, aj keď podmienka hneď neplatí: vypíše 5, i = 6, koniec.' },
  { id: 'q-continue-for', topic: 'cykly', code: `int i;\nfor (i = 0; i < 6; i++) {\n    if (i % 3 == 0)\n        continue;\n    printf("%d", i);\n}\nprintf("\\n");`,
    explain: 'continue preskočí zvyšok tela pre i = 0 a 3. Vypíšu sa 1, 2, 4, 5 bez medzier.' },
  { id: 'q-break-vnoreny', topic: 'cykly', code: `int i, j, s = 0;\nfor (i = 1; i <= 3; i++)\n    for (j = 1; j <= 3; j++) {\n        if (j > i)\n            break;\n        s += j;\n    }\nprintf("%d\\n", s);`,
    explain: 'break ukončí iba vnútorný cyklus. Pre i = 1 sa pripočíta 1, pre i = 2 1 + 2, pre i = 3 1 + 2 + 3. Spolu 10.' },
  { id: 'q-for-bodkociarka', topic: 'cykly', code: `int i;\nfor (i = 0; i < 10; i += 4);\nprintf("%d\\n", i);`,
    explain: 'Bodkočiarka je prázdne telo. i = 0, 4, 8, 12 – pri 12 cyklus skončí a vypíše sa 12.' },
  { id: 'q-trojuholnik-bodky', topic: 'cykly', code: `int i, j;\nfor (i = 1; i <= 3; i++) {\n    for (j = 0; j < 3 - i; j++)\n        printf(".");\n    for (j = 0; j < i; j++)\n        printf("*");\n    printf("\\n");\n}`,
    explain: 'Riadok i má 3 − i bodiek a i hviezdičiek: ..*, .**, ***.' },
  { id: 'q-while-nuly', topic: 'cykly', code: `int n = 4071, p = 0;\nwhile (n > 0) {\n    if (n % 10 == 0)\n        p++;\n    n /= 10;\n}\nprintf("%d\\n", p);`,
    explain: 'Cyklus prechádza cifry odzadu (1, 7, 0, 4) a počíta nuly – je jedna.' },
  { id: 'q-rad-int', topic: 'cykly', code: `double s = 0;\nint i;\nfor (i = 1; i <= 4; i++)\n    s += 1 / i;\nprintf("%.2f\\n", s);`,
    explain: '1 / i je celočíselné delenie: 1/1 = 1, 1/2 = 1/3 = 1/4 = 0. Súčet je 1.00. Správne by bolo 1.0 / i.' },
  { id: 'q-postinkrement-while', topic: 'cykly', code: `int i = 0;\nwhile (i++ < 3)\n    printf("%d ", i);\nprintf("| %d\\n", i);`,
    explain: 'i++ porovná starú hodnotu a až potom zvýši: porovnania 0, 1, 2 platia (vypíše 1 2 3), pri 3 < 3 neplatí, ale i sa aj tak zvýši na 4.' },
  { id: 'q-dowhile-sucet', topic: 'cykly', code: `int n = 0, s = 0;\ndo {\n    s += n;\n    n += 2;\n} while (n <= 6);\nprintf("%d %d\\n", s, n);`,
    explain: 's = 0 + 2 + 4 + 6 = 12. Po pripočítaní 6 je n = 8 a podmienka n <= 6 neplatí.' },
  { id: 'q-for-znaky', topic: 'cykly', code: `char c;\nfor (c = 'a'; c <= 'e'; c += 2)\n    printf("%c", c);\nprintf("\\n");`,
    explain: 'Znak je číslo, dá sa k nemu pripočítať: a, c, e.' },
  { id: 'q-vnoreny-pocet', topic: 'cykly', code: `int i, j, k = 0;\nfor (i = 0; i < 4; i++)\n    for (j = i; j < 4; j++)\n        k++;\nprintf("%d\\n", k);`,
    explain: 'Vnútorný cyklus prebehne 4, 3, 2, 1-krát podľa i. Spolu 10.' },
];
