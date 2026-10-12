# FIIT Tréner

Lokálna webová appka na precvičovanie predmetov 1. semestra FIIT STU, hlavne **PPI** (Princípy počítačového inžinierstva) a **PrPr** (Procedurálne programovanie). Každé cvičenie generuje nové príklady a hneď kontroluje odpoveď. Úlohy v C sa naozaj prekladajú a spúšťajú na testoch.

Je to pomôcka na učenie: cvičné príklady, nie riešenia zadaní.

## Čo obsahuje
**PPI**
- číselné sústavy a kódy (priamy, inverzný, doplnkový, pretečenie, BCD, Gray)
- Booleova algebra: tabuľky, ÚDNF/ÚKNF, zjednodušovanie, De Morgan, analýza obvodu
- Karnaughove mapy (MDNF, MKNF, bezhazardné formy, 3–5 premenných) s kreslením slučiek myšou
- NAND/NOR formy (zápis so šípkami ↑ ↓)
- dekóder a skupinová minimalizácia, hodnotená ako na cvičení: počet členov vrátane NOT → súčet vstupov → literály
- klopné obvody: časové priebehy, udalosti a hrany, budiace tabuľky, prevody PO
- konečné automaty: simulácia, graf → tabuľka, návrh zo slovného opisu (aj s dvoma vstupmi), Moore ↔ Mealy, minimalizácia
- štruktúrna syntéza: kódovanie stavov, budiaca tabuľka, budiace funkcie
- simulácie testov s časomierou

**PrPr**
- 67 úloh v C s testami, z toho 26 na cykly. Chyby kompilátora sú preložené do slovenčiny a výstup sa porovnáva s viditeľnými medzerami.
- 39 otázok „Čo vypíše program?“ s vysvetlením
- simulácia počítačového testu (3 úlohy, 60 minút), pieskovisko na vlastný kód

**Ďalej:** kvízy z teórie, denník chýb, štatistiky, kartičky s opakovaním (SM-2) a prehliadač poznámok z vlastného Obsidian vaultu.

## Spustenie
Potrebuješ **Node.js 18+** a **clang**. Na Macu ho nainštaluješ príkazom `xcode-select --install`. Na Linuxe použi balík `clang`, na Windowse appku spusti vo WSL.

```bash
git clone https://github.com/xkotrubcikleo/fiit-trener.git
cd fiit-trener
node server.mjs
```
Potom otvor http://localhost:4173. Na Macu stačí aj dvojklik na `start.command`.

Žiadne `npm install` netreba, appka nemá externé balíky. Pokrok sa ukladá do `data/progress.json`.

**iPad alebo telefón v rovnakej Wi-Fi:** spusti `node server.mjs --lan` a otvor adresu s prístupovým kľúčom, ktorú vypíše terminál. Kľúč nikomu nedávaj, umožňuje spúšťať kód na tvojom počítači.

## Kartičky a poznámky z Obsidianu (nepovinné)
Pri prvom spustení vznikne `data/config.json`. V ňom nastav `vaultPath` (cestu k tvojmu Obsidian vaultu) a v `subjects` priečinky predmetov. Kartičky sa berú z riadkov v tvare `otázka::odpoveď`. Bez vaultu funguje všetko ostatné, kartičky a poznámky sú iba prázdne. V tom istom súbore sú aj termíny na domovskej obrazovke.

## Pre vývoj
- `node --test tests/*.test.mjs` – testy logiky (minimalizácia, skupinová minimalizácia, automaty, kódy)
- nové úlohy z C: doplň `content/prpr/tasks.mjs` (alebo `tasks-cykly.mjs`) a spusti `node tools/build-prpr.mjs`. Skript preloží vzorové riešenia, vypočíta očakávané výstupy a overí, že úlohy „nájdi chybu“ naozaj zlyhávajú.
