-- Mock companies + job offers for production (baza).
-- Generated from the local dev dataset. Safe to re-run: every insert is guarded
-- by NOT EXISTS so nothing duplicates on a second run.
-- Run in the Railway dashboard (Postgres service -> Query) or via
--   railway connect Postgres  (then paste this file)
begin;

-- Auditorzy Kursu Transport
with new_user as (
  insert into user_account (email, roles, can_login, status)
  select 'demo+auditorzy-kursu-transport@baza.app', ARRAY['company']::text[], false, 'active'
  where not exists (select 1 from companies where nip = '1000000002')
  returning id
)
insert into companies (user_id, name, nip, description, base_location, base_lat, base_lng)
select new_user.id, 'Auditorzy Kursu Transport', '1000000002', 'Spedycja krajowa i trasy zachodnioeuropejskie z bazą w Krakowie. Mieszana flota firanek i chłodni, stawiamy na stałe zestawy przypisane do kierowcy i przewidywalny grafik powrotów.', 'Kraków, ul. Płaszowska 58', 50.0335, 19.9788
from new_user;

-- Baltic Reefers
with new_user as (
  insert into user_account (email, roles, can_login, status)
  select 'demo+baltic-reefers@baza.app', ARRAY['company']::text[], false, 'active'
  where not exists (select 1 from companies where nip = '1000000001')
  returning id
)
insert into companies (user_id, name, nip, description, base_location, base_lat, base_lng)
select new_user.id, 'Baltic Reefers', '1000000001', 'Przewozy chłodnicze ze Szczecina na Skandynawię i wschodnie Niemcy. Flota Volvo FH z agregatami Carrier, głównie ryby, nabiał i mrożonki. Na rynku od 2011 roku, własny serwis w bazie.', 'Szczecin, ul. Energetyków 3', 53.4285, 14.5528
from new_user;

-- Centrum Flota
with new_user as (
  insert into user_account (email, roles, can_login, status)
  select 'demo+centrum-flota@baza.app', ARRAY['company']::text[], false, 'active'
  where not exists (select 1 from companies where nip = '1000000007')
  returning id
)
insert into companies (user_id, name, nip, description, base_location, base_lat, base_lng)
select new_user.id, 'Centrum Flota', '1000000007', 'Łódzka firma transportowa łącząca dystrybucję lokalną (kat. B) z długodystansowymi trasami cysternowymi na Niemcy. Elastyczne grafiki, także zlecenia nietypowe.', 'Łódź, ul. Lodowa 102', 51.7592, 19.456
from new_user;

-- Karpaty Spedycja
with new_user as (
  insert into user_account (email, roles, can_login, status)
  select 'demo+karpaty-spedycja@baza.app', ARRAY['company']::text[], false, 'active'
  where not exists (select 1 from companies where nip = '1000000010')
  returning id
)
insert into companies (user_id, name, nip, description, base_location, base_lat, base_lng)
select new_user.id, 'Karpaty Spedycja', '1000000010', 'Rzeszowski przewoźnik obsługujący wschodnią granicę — regularne trasy na Ukrainę oraz codzienne zjazdy krajówki na Słowację. W ofercie także transport maszyn budowlanych.', 'Rzeszów, ul. Przemysłowa 22', 50.0413, 21.999
from new_user;

-- Kraków Express
with new_user as (
  insert into user_account (email, roles, can_login, status)
  select 'demo+krakow-express@baza.app', ARRAY['company']::text[], false, 'active'
  where not exists (select 1 from companies where nip = '1000000003')
  returning id
)
insert into companies (user_id, name, nip, description, base_location, base_lat, base_lng)
select new_user.id, 'Kraków Express', '1000000003', 'Rodzinna firma transportowa z Krakowa działająca od 2008 roku. Trasy krajowe, wyjazdy na Austrię i Węgry oraz przewozy busem turystycznym w sezonie letnim.', 'Kraków, ul. Igołomska 19', 50.0647, 19.945
from new_user;

-- Lublin Trans
with new_user as (
  insert into user_account (email, roles, can_login, status)
  select 'demo+lublin-trans@baza.app', ARRAY['company']::text[], false, 'active'
  where not exists (select 1 from companies where nip = '1000000011')
  returning id
)
insert into companies (user_id, name, nip, description, base_location, base_lat, base_lng)
select new_user.id, 'Lublin Trans', '1000000011', 'Firma transportowa z Lublina z siatką połączeń na Niemcy i Ukrainę. Nowa flota MEGA-naczep, własna baza serwisowa przy ul. Mełgiewskiej.', 'Lublin, ul. Mełgiewska 18', 51.2465, 22.5684
from new_user;

-- Mazur Truck
with new_user as (
  insert into user_account (email, roles, can_login, status)
  select 'demo+mazur-truck@baza.app', ARRAY['company']::text[], false, 'active'
  where not exists (select 1 from companies where nip = '1000000013')
  returning id
)
insert into companies (user_id, name, nip, description, base_location, base_lat, base_lng)
select new_user.id, 'Mazur Truck', '1000000013', 'Firma transportowa z Olsztyna obsługująca trasy bałtyckie — Litwa i Niemcy, w tym przewóz pasz luzem naczepami silosowymi. Krótkie trasy krajowe uzupełniają grafik.', 'Olsztyn, ul. Towarowa 4', 53.7784, 20.4801
from new_user;

-- Nord Cargo
with new_user as (
  insert into user_account (email, roles, can_login, status)
  select 'demo+nord-cargo@baza.app', ARRAY['company']::text[], false, 'active'
  where not exists (select 1 from companies where nip = '1000000009')
  returning id
)
insert into companies (user_id, name, nip, description, base_location, base_lat, base_lng)
select new_user.id, 'Nord Cargo', '1000000009', 'Firma spedycyjna z Gdańska specjalizująca się w transporcie kontenerowym z terminala DCT oraz przeprawach promowych na Skandynawię. Współpraca z armatorami od 2014 roku.', 'Gdańsk, ul. Kontenerowa 8', 54.381, 18.67
from new_user;

-- Odra Freight
with new_user as (
  insert into user_account (email, roles, can_login, status)
  select 'demo+odra-freight@baza.app', ARRAY['company']::text[], false, 'active'
  where not exists (select 1 from companies where nip = '1000000006')
  returning id
)
insert into companies (user_id, name, nip, description, base_location, base_lat, base_lng)
select new_user.id, 'Odra Freight', '1000000006', 'Wrocławski przewoźnik z 15-letnim doświadczeniem w transporcie chłodniczym na Włochy oraz przewozach dalekobieżnych na Półwysep Iberyjski. Flota wyposażona w HDS do rozładunków własnych.', 'Wrocław, ul. Robotnicza 40', 51.1079, 17.0385
from new_user;

-- Podlasie Cargo
with new_user as (
  insert into user_account (email, roles, can_login, status)
  select 'demo+podlasie-cargo@baza.app', ARRAY['company']::text[], false, 'active'
  where not exists (select 1 from companies where nip = '1000000012')
  returning id
)
insert into companies (user_id, name, nip, description, base_location, base_lat, base_lng)
select new_user.id, 'Podlasie Cargo', '1000000012', 'Białostocki przewoźnik specjalizujący się w kierunkach wschodnich — Litwa, Białoruś i Niemcy. Doświadczona kadra spedytorów zna procedury odprawy celnej na wschodniej granicy.', 'Białystok, ul. Produkcyjna 79', 53.1325, 23.1688
from new_user;

-- Sądecki Transport
with new_user as (
  insert into user_account (email, roles, can_login, status)
  select 'demo+sadecki-transport@baza.app', ARRAY['company']::text[], false, 'active'
  where not exists (select 1 from companies where nip = '1000000015')
  returning id
)
insert into companies (user_id, name, nip, description, base_location, base_lat, base_lng)
select new_user.id, 'Sądecki Transport', '1000000015', 'Firma z Chełmca obsługująca południową granicę: kruszywo na Słowację, regularne trasy firankowe na Austrię i Czechy oraz przewóz pasz naczepą silosową.', 'Chełmiec, ul. Bocheńska 18', 49.6302, 20.6545
from new_user;

-- Śląsk Transport
with new_user as (
  insert into user_account (email, roles, can_login, status)
  select 'demo+slask-transport@baza.app', ARRAY['company']::text[], false, 'active'
  where not exists (select 1 from companies where nip = '1000000008')
  returning id
)
insert into companies (user_id, name, nip, description, base_location, base_lat, base_lng)
select new_user.id, 'Śląsk Transport', '1000000008', 'Przewoźnik z Katowic obsługujący trasy do Czech i Austrii oraz krajowy transport kruszyw wywrotkami. Posiadamy uprawnienia ADR do przewozu paliw i chemii.', 'Katowice, ul. Spedycyjna 15', 50.259, 19.021
from new_user;

-- Tatra Lowbed
with new_user as (
  insert into user_account (email, roles, can_login, status)
  select 'demo+tatra-lowbed@baza.app', ARRAY['company']::text[], false, 'active'
  where not exists (select 1 from companies where nip = '1000000014')
  returning id
)
insert into companies (user_id, name, nip, description, base_location, base_lat, base_lng)
select new_user.id, 'Tatra Lowbed', '1000000014', 'Nowosądecki przewoźnik specjalizujący się w transporcie niskopodwoziowym — maszyny budowlane i prefabrykaty na Niemcy oraz Czechy. Kierowcy z uprawnieniami do przewozu ponadgabarytów.', 'Nowy Sącz, ul. Nawojowska 50', 49.6217, 20.6972
from new_user;

-- Trans-Pol Logistyka
with new_user as (
  insert into user_account (email, roles, can_login, status)
  select 'demo+trans-pol-logistyka@baza.app', ARRAY['company']::text[], false, 'active'
  where not exists (select 1 from companies where nip = '1000000004')
  returning id
)
insert into companies (user_id, name, nip, description, base_location, base_lat, base_lng)
select new_user.id, 'Trans-Pol Logistyka', '1000000004', 'Firma spedycyjna z Warszawy obsługująca regularne linie na Niemcy i Francję. Nowoczesna flota naczep firanowych i chłodni, własny dział utrzymania w bazie na Modlińskiej.', 'Warszawa, ul. Modlińska 120', 52.292, 21.03
from new_user;

-- Wielkopolska Haulage
with new_user as (
  insert into user_account (email, roles, can_login, status)
  select 'demo+wielkopolska-haulage@baza.app', ARRAY['company']::text[], false, 'active'
  where not exists (select 1 from companies where nip = '1000000005')
  returning id
)
insert into companies (user_id, name, nip, description, base_location, base_lat, base_lng)
select new_user.id, 'Wielkopolska Haulage', '1000000005', 'Poznańska firma transportowa specjalizująca się w przewozach ponadgabarytowych i transporcie samochodów na platformach. Stały klient — sieć dealerska w Niemczech i Holandii.', 'Poznań, ul. Głogowska 210', 52.4, 16.89
from new_user;

-- Offers (looked up by company NIP + title so this stays idempotent independent of the block above)

insert into job_offers (company_id, title, description, home_return_cadence, required_years_experience, required_transport_type, license_category, employment_forms, routes, salary_min, salary_max, salary_currency, published)
select comp.id, 'Kierowca C+E — firanka Kraków–Niemcy', 'Stałe trasy Kraków–Niemcy (NRW / Bawaria) na naczepie firanowej MEGA. Tydzień w drodze, weekend w domu. Zestaw przypisany na stałe do kierowcy, nowe ciągniki MAN TGX. Umowa o pracę, dieta, karta paliwowa. Konto audytorskie — dane demonstracyjne.', 'weekly', 2, 'curtain', 'C_E', ARRAY['b2b']::text[], '[{"to":{"code":"DE","name":"Niemcy"},"from":{"code":"PL","name":"Polska"}}]'::jsonb, '9500.00', '12500.00', 'PLN', true
from companies comp
where comp.nip = '1000000002'
  and not exists (
    select 1 from job_offers jo where jo.company_id = comp.id and jo.title = 'Kierowca C+E — firanka Kraków–Niemcy'
  );

insert into job_offers (company_id, title, description, home_return_cadence, required_years_experience, required_transport_type, license_category, employment_forms, routes, salary_min, salary_max, salary_currency, published)
select comp.id, 'Kierowca chłodni — Francja / Benelux', 'Przewóz spożywki z bazy w Krakowie na Francję, Holandię i Belgię, agregaty Carrier w naczepach. Powrót do bazy co dwa tygodnie, wymagane doświadczenie w chłodniach i znajomość obsługi rejestratora temperatury. Konto audytorskie — dane demonstracyjne.', 'biweekly', 3, 'reefer', 'C_E', ARRAY['uop','b2b']::text[], '[{"to":{"code":"FR","name":"Francja"},"from":{"code":"PL","name":"Polska"}},{"to":{"code":"NL","name":"Holandia"},"from":{"code":"PL","name":"Polska"}}]'::jsonb, '11000.00', '14500.00', 'PLN', true
from companies comp
where comp.nip = '1000000002'
  and not exists (
    select 1 from job_offers jo where jo.company_id = comp.id and jo.title = 'Kierowca chłodni — Francja / Benelux'
  );

insert into job_offers (company_id, title, description, home_return_cadence, required_years_experience, required_transport_type, license_category, employment_forms, routes, salary_min, salary_max, salary_currency, published)
select comp.id, 'Kierowca C — krajówka Małopolska / Śląsk', 'Trasy krajowe z Krakowa: dystrybucja do sieci handlowych i dojazdy do terminali przeładunkowych w Małopolsce i na Śląsku. Codzienny powrót do domu, praca od poniedziałku do piątku, kat. C wystarczy. Konto audytorskie — dane demonstracyjne.', 'daily', 1, 'curtain', 'C', ARRAY['uop','zlecenie']::text[], '[{"to":{"code":"PL","name":"Polska"},"from":{"code":"PL","name":"Polska"}}]'::jsonb, '7000.00', '9000.00', 'PLN', true
from companies comp
where comp.nip = '1000000002'
  and not exists (
    select 1 from job_offers jo where jo.company_id = comp.id and jo.title = 'Kierowca C — krajówka Małopolska / Śląsk'
  );

insert into job_offers (company_id, title, description, home_return_cadence, required_years_experience, required_transport_type, license_category, employment_forms, routes, salary_min, salary_max, salary_currency, published)
select comp.id, 'Chłodnia na Danię', 'Transport ryb i nabiału ze Szczecina do Kopenhagi naczepą chłodniczą. Tydzień w trasie, powrót na weekend do bazy. Wymagane doświadczenie w chłodniach, mile widziana znajomość obsługi terminala promowego.', 'weekly', 2, 'reefer', 'C_E', ARRAY['b2b']::text[], '[{"to":{"code":"DK","name":"Dania"},"from":{"code":"PL","name":"Polska"}}]'::jsonb, '10000.00', '12500.00', 'PLN', true
from companies comp
where comp.nip = '1000000001'
  and not exists (
    select 1 from job_offers jo where jo.company_id = comp.id and jo.title = 'Chłodnia na Danię'
  );

insert into job_offers (company_id, title, description, home_return_cadence, required_years_experience, required_transport_type, license_category, employment_forms, routes, salary_min, salary_max, salary_currency, published)
select comp.id, 'Chłodnia Szczecin — Berlin (dziennie)', 'Krótkie skoki chłodnią do Brandenburgii i Berlina z codziennym powrotem do bazy w Szczecinie. Idealne dla osób z rodziną — brak noclegów w trasie. Rozładunki w marketach i centrach dystrybucyjnych.', 'daily', 1, 'reefer', 'C_E', ARRAY['b2b']::text[], '[{"to":{"code":"DE","name":"Niemcy"},"from":{"code":"PL","name":"Polska"}}]'::jsonb, '8000.00', '10000.00', 'PLN', true
from companies comp
where comp.nip = '1000000001'
  and not exists (
    select 1 from job_offers jo where jo.company_id = comp.id and jo.title = 'Chłodnia Szczecin — Berlin (dziennie)'
  );

insert into job_offers (company_id, title, description, home_return_cadence, required_years_experience, required_transport_type, license_category, employment_forms, routes, salary_min, salary_max, salary_currency, published)
select comp.id, 'Dostawczak — aglomeracja łódzka', 'Dystrybucja miejska busem dostawczym po aglomeracji łódzkiej — dowozy do sklepów i punktów odbioru. Praca od rana, kat. B wystarczy, stawka rozliczana za trasę (bez górnych widełek).', 'daily', 0, 'van', 'B', ARRAY['zlecenie']::text[], '[{"to":{"code":"PL","name":"Polska"},"from":{"code":"PL","name":"Polska"}}]'::jsonb, '5800.00', null, 'PLN', true
from companies comp
where comp.nip = '1000000007'
  and not exists (
    select 1 from job_offers jo where jo.company_id = comp.id and jo.title = 'Dostawczak — aglomeracja łódzka'
  );

insert into job_offers (company_id, title, description, home_return_cadence, required_years_experience, required_transport_type, license_category, employment_forms, routes, salary_min, salary_max, salary_currency, published)
select comp.id, 'Firanka Łódź — Francja', 'Trasy firanką z centralnej Polski na Francję — ładunki paletowe, głównie okolice Paryża i Lyonu. Powrót do bazy w Łodzi co dwa tygodnie, rozliczenie na zleceniu, karta paliwowa.', 'biweekly', 3, 'curtain', 'C_E', ARRAY['zlecenie']::text[], '[{"to":{"code":"FR","name":"Francja"},"from":{"code":"PL","name":"Polska"}}]'::jsonb, '11000.00', '14000.00', 'PLN', true
from companies comp
where comp.nip = '1000000007'
  and not exists (
    select 1 from job_offers jo where jo.company_id = comp.id and jo.title = 'Firanka Łódź — Francja'
  );

insert into job_offers (company_id, title, description, home_return_cadence, required_years_experience, required_transport_type, license_category, employment_forms, routes, salary_min, salary_max, salary_currency, published)
select comp.id, 'Inne — transport specjalny', 'Nietypowe zlecenia poza stałą siatką — doraźne kursy na Niemcy i Czechy w zależności od bieżących potrzeb klientów. Grafik i widełki płacowe do indywidualnego ustalenia, liczy się doświadczenie i elastyczność.', 'flexible', 5, 'other', 'CE', ARRAY['b2b','zlecenie']::text[], '[{"to":{"code":"DE","name":"Niemcy"},"from":{"code":"PL","name":"Polska"}},{"to":{"code":"CZ","name":"Czechy"},"from":{"code":"PL","name":"Polska"}}]'::jsonb, null, null, null, true
from companies comp
where comp.nip = '1000000007'
  and not exists (
    select 1 from job_offers jo where jo.company_id = comp.id and jo.title = 'Inne — transport specjalny'
  );

insert into job_offers (company_id, title, description, home_return_cadence, required_years_experience, required_transport_type, license_category, employment_forms, routes, salary_min, salary_max, salary_currency, published)
select comp.id, 'Silos cement — Niemcy', 'Przewóz cementu i wapna luzem naczepą silosową na trasie Łódź–Niemcy. Tydzień w drodze, weekend w domu. Szkolenie z obsługi silosu zapewniamy, doświadczenie w tym rodzaju transportu mile widziane.', 'weekly', 2, 'silo', 'C_E', ARRAY['b2b']::text[], '[{"to":{"code":"DE","name":"Niemcy"},"from":{"code":"PL","name":"Polska"}}]'::jsonb, '10000.00', '13000.00', 'PLN', true
from companies comp
where comp.nip = '1000000007'
  and not exists (
    select 1 from job_offers jo where jo.company_id = comp.id and jo.title = 'Silos cement — Niemcy'
  );

insert into job_offers (company_id, title, description, home_return_cadence, required_years_experience, required_transport_type, license_category, employment_forms, routes, salary_min, salary_max, salary_currency, published)
select comp.id, 'Firanka na Ukrainę', 'Regularne trasy firanką z Rzeszowa na Lwów i Kijów, ładunki przemysłowe i paletowe. Tydzień w trasie, kat. C. Znajomość procedur odprawy celnej na wschodniej granicy mile widziana.', 'weekly', 2, 'curtain', 'C', ARRAY['b2b']::text[], '[{"to":{"code":"UA","name":"Ukraina"},"from":{"code":"PL","name":"Polska"}}]'::jsonb, '8500.00', '11000.00', 'PLN', true
from companies comp
where comp.nip = '1000000010'
  and not exists (
    select 1 from job_offers jo where jo.company_id = comp.id and jo.title = 'Firanka na Ukrainę'
  );

insert into job_offers (company_id, title, description, home_return_cadence, required_years_experience, required_transport_type, license_category, employment_forms, routes, salary_min, salary_max, salary_currency, published)
select comp.id, 'Krajówka Podkarpacie — Słowacja', 'Codzienne zjazdy krajówką z Rzeszowa do Koszyc na Słowacji — dystrybucja towarów przemysłowych. Wieczorem z powrotem w domu, praca na zleceniu z rozliczeniem za kurs.', 'daily', 0, 'curtain', 'C', ARRAY['zlecenie']::text[], '[{"to":{"code":"SK","name":"Słowacja"},"from":{"code":"PL","name":"Polska"}}]'::jsonb, '6500.00', '8200.00', 'PLN', true
from companies comp
where comp.nip = '1000000010'
  and not exists (
    select 1 from job_offers jo where jo.company_id = comp.id and jo.title = 'Krajówka Podkarpacie — Słowacja'
  );

insert into job_offers (company_id, title, description, home_return_cadence, required_years_experience, required_transport_type, license_category, employment_forms, routes, salary_min, salary_max, salary_currency, published)
select comp.id, 'Niskopodwozie — maszyny na Niemcy', 'Transport maszyn budowlanych naczepą niskopodwoziową z bazy w Rzeszowie na budowy w Niemczech. Wyjazdy na 3–4 tygodnie, wymagane doświadczenie z przewozem ponadgabarytów i mocowaniem ładunku.', 'monthly', 5, 'low_loader', 'C_E', ARRAY['uop','b2b','zlecenie']::text[], '[{"to":{"code":"DE","name":"Niemcy"},"from":{"code":"PL","name":"Polska"}}]'::jsonb, '14000.00', '18000.00', 'PLN', true
from companies comp
where comp.nip = '1000000010'
  and not exists (
    select 1 from job_offers jo where jo.company_id = comp.id and jo.title = 'Niskopodwozie — maszyny na Niemcy'
  );

insert into job_offers (company_id, title, description, home_return_cadence, required_years_experience, required_transport_type, license_category, employment_forms, routes, salary_min, salary_max, salary_currency, published)
select comp.id, 'Bus turystyczny — Włochy', 'Przewozy turystyczne busem 8+1 na Włochy w sezonie letnim — wycieczki grup zorganizowanych i pielgrzymek. Wyjazdy miesięczne, kat. B, mile widziane doświadczenie w przewozie osób.', 'monthly', 1, 'bus', 'B', ARRAY['zlecenie']::text[], '[{"to":{"code":"IT","name":"Włochy"},"from":{"code":"PL","name":"Polska"}}]'::jsonb, '7000.00', '9000.00', 'PLN', true
from companies comp
where comp.nip = '1000000003'
  and not exists (
    select 1 from job_offers jo where jo.company_id = comp.id and jo.title = 'Bus turystyczny — Włochy'
  );

insert into job_offers (company_id, title, description, home_return_cadence, required_years_experience, required_transport_type, license_category, employment_forms, routes, salary_min, salary_max, salary_currency, published)
select comp.id, 'Cysterna — Węgry', 'Transport paliw cysterną na trasie Kraków–Budapeszt. Powrót do bazy co dwa tygodnie, świadectwo ADR mile widziane (możliwe szkolenie na koszt firmy dla doświadczonych kierowców kat. C+E).', 'biweekly', 4, 'tanker', 'C_E', ARRAY['uop','b2b']::text[], '[{"to":{"code":"HU","name":"Węgry"},"from":{"code":"PL","name":"Polska"}}]'::jsonb, '12000.00', '15000.00', 'PLN', true
from companies comp
where comp.nip = '1000000003'
  and not exists (
    select 1 from job_offers jo where jo.company_id = comp.id and jo.title = 'Cysterna — Węgry'
  );

insert into job_offers (company_id, title, description, home_return_cadence, required_years_experience, required_transport_type, license_category, employment_forms, routes, salary_min, salary_max, salary_currency, published)
select comp.id, 'Firanka Kraków — Austria', 'Południowa siatka połączeń firanką Kraków–Wiedeń, ładunki paletowe dla stałych klientów. Tydzień w trasie, powrót na weekend, nowe naczepy w flocie.', 'weekly', 2, 'curtain', 'C_E', ARRAY['b2b']::text[], '[{"to":{"code":"AT","name":"Austria"},"from":{"code":"PL","name":"Polska"}}]'::jsonb, '9500.00', '12000.00', 'PLN', true
from companies comp
where comp.nip = '1000000003'
  and not exists (
    select 1 from job_offers jo where jo.company_id = comp.id and jo.title = 'Firanka Kraków — Austria'
  );

insert into job_offers (company_id, title, description, home_return_cadence, required_years_experience, required_transport_type, license_category, employment_forms, routes, salary_min, salary_max, salary_currency, published)
select comp.id, 'Firanka Lublin — Niemcy', 'Standardowa trasa zachodnia firanką z Lublina na Niemcy (Nadrenia Północna-Westfalia). Tydzień w drodze, weekend w domu. Nowe naczepy MEGA, umowa o pracę lub zlecenie do wyboru.', 'weekly', 2, 'curtain', 'C_E', ARRAY['uop','zlecenie']::text[], '[{"to":{"code":"DE","name":"Niemcy"},"from":{"code":"PL","name":"Polska"}}]'::jsonb, '9000.00', '11500.00', 'PLN', true
from companies comp
where comp.nip = '1000000011'
  and not exists (
    select 1 from job_offers jo where jo.company_id = comp.id and jo.title = 'Firanka Lublin — Niemcy'
  );

insert into job_offers (company_id, title, description, home_return_cadence, required_years_experience, required_transport_type, license_category, employment_forms, routes, salary_min, salary_max, salary_currency, published)
select comp.id, 'Wywrotka na Ukrainę', 'Przewóz materiałów sypkich wywrotką na trasie Lublin–Lwów, obsługa budów i punktów przeładunkowych po stronie ukraińskiej. Tydzień w trasie, kat. C wystarczy.', 'weekly', 2, 'tipper', 'C', ARRAY['uop','b2b']::text[], '[{"to":{"code":"UA","name":"Ukraina"},"from":{"code":"PL","name":"Polska"}}]'::jsonb, '7500.00', '9800.00', 'PLN', true
from companies comp
where comp.nip = '1000000011'
  and not exists (
    select 1 from job_offers jo where jo.company_id = comp.id and jo.title = 'Wywrotka na Ukrainę'
  );

insert into job_offers (company_id, title, description, home_return_cadence, required_years_experience, required_transport_type, license_category, employment_forms, routes, salary_min, salary_max, salary_currency, published)
select comp.id, 'Kierowca C — Litwa', 'Transport towarów ogólnych naczepą firanową z Olsztyna do Kowna. Tydzień w trasie, powrót na weekend. Kat. C wystarczy, mile widziana znajomość podstaw języka rosyjskiego lub litewskiego.', 'weekly', 1, 'curtain', 'C', ARRAY['uop','b2b']::text[], '[{"to":{"code":"LT","name":"Litwa"},"from":{"code":"PL","name":"Polska"}}]'::jsonb, '8000.00', '10000.00', 'PLN', true
from companies comp
where comp.nip = '1000000013'
  and not exists (
    select 1 from job_offers jo where jo.company_id = comp.id and jo.title = 'Kierowca C — Litwa'
  );

insert into job_offers (company_id, title, description, home_return_cadence, required_years_experience, required_transport_type, license_category, employment_forms, routes, salary_min, salary_max, salary_currency, published)
select comp.id, 'Silos paszowy — Niemcy', 'Przewóz pasz luzem naczepą silosową z Olsztyna na fermy w Niemczech. Powrót co dwa tygodnie, szkolenie z obsługi silosu w cenie, umowa o pracę.', 'biweekly', 3, 'silo', 'C_E', ARRAY['uop']::text[], '[{"to":{"code":"DE","name":"Niemcy"},"from":{"code":"PL","name":"Polska"}}]'::jsonb, '10000.00', '12800.00', 'PLN', true
from companies comp
where comp.nip = '1000000013'
  and not exists (
    select 1 from job_offers jo where jo.company_id = comp.id and jo.title = 'Silos paszowy — Niemcy'
  );

insert into job_offers (company_id, title, description, home_return_cadence, required_years_experience, required_transport_type, license_category, employment_forms, routes, salary_min, salary_max, salary_currency, published)
select comp.id, 'Firanka na Szwecję — prom', 'Trasa firanką z Gdańska do Szwecji z przeprawą promową ze Świnoujścia lub Gdyni. Tydzień w trasie, firma zapewnia bilet na prom i kabinę na czas przeprawy.', 'weekly', 2, 'curtain', 'C_E', ARRAY['uop','zlecenie']::text[], '[{"to":{"code":"SE","name":"Szwecja"},"from":{"code":"PL","name":"Polska"}}]'::jsonb, '10000.00', '13000.00', 'PLN', true
from companies comp
where comp.nip = '1000000009'
  and not exists (
    select 1 from job_offers jo where jo.company_id = comp.id and jo.title = 'Firanka na Szwecję — prom'
  );

insert into job_offers (company_id, title, description, home_return_cadence, required_years_experience, required_transport_type, license_category, employment_forms, routes, salary_min, salary_max, salary_currency, published)
select comp.id, 'Kontener na Belgię', 'Uzupełnienie stałej siatki kontenerowej na kierunek Beneluks — transport z terminala w Gdańsku do Belgii. Elastyczny grafik powrotów do indywidualnego ustalenia z dyspozytorem.', 'flexible', 3, 'container', 'CE', ARRAY['b2b']::text[], '[{"to":{"code":"BE","name":"Belgia"},"from":{"code":"PL","name":"Polska"}}]'::jsonb, '10500.00', '13500.00', 'PLN', true
from companies comp
where comp.nip = '1000000009'
  and not exists (
    select 1 from job_offers jo where jo.company_id = comp.id and jo.title = 'Kontener na Belgię'
  );

insert into job_offers (company_id, title, description, home_return_cadence, required_years_experience, required_transport_type, license_category, employment_forms, routes, salary_min, salary_max, salary_currency, published)
select comp.id, 'Kontenery Gdańsk — Rotterdam', 'Wożenie kontenerów morskich z terminala DCT Gdańsk do portów w Holandii. Wyjazd na 3–4 tygodnie, stawka podstawowa plus premia za przejechane kilometry.', 'monthly', 4, 'container', 'C_E', ARRAY['uop']::text[], '[{"to":{"code":"NL","name":"Holandia"},"from":{"code":"PL","name":"Polska"}}]'::jsonb, '12000.00', '15500.00', 'PLN', true
from companies comp
where comp.nip = '1000000009'
  and not exists (
    select 1 from job_offers jo where jo.company_id = comp.id and jo.title = 'Kontenery Gdańsk — Rotterdam'
  );

insert into job_offers (company_id, title, description, home_return_cadence, required_years_experience, required_transport_type, license_category, employment_forms, routes, salary_min, salary_max, salary_currency, published)
select comp.id, 'Chłodnia na Włochy', 'Przewóz spożywki naczepą chłodniczą z Wrocławia do Mediolanu i Werony. Powrót co dwa tygodnie, wymagane świadectwo ATP — firma pokrywa koszt przeszkolenia dla odpowiednich kandydatów.', 'biweekly', 3, 'reefer', 'C_E', ARRAY['b2b']::text[], '[{"to":{"code":"IT","name":"Włochy"},"from":{"code":"PL","name":"Polska"}}]'::jsonb, '11500.00', '14500.00', 'PLN', true
from companies comp
where comp.nip = '1000000006'
  and not exists (
    select 1 from job_offers jo where jo.company_id = comp.id and jo.title = 'Chłodnia na Włochy'
  );

insert into job_offers (company_id, title, description, home_return_cadence, required_years_experience, required_transport_type, license_category, employment_forms, routes, salary_min, salary_max, salary_currency, published)
select comp.id, 'Firanka dalekobieżna — Hiszpania', 'Trasa dalekobieżna firanką z Wrocławia na Półwysep Iberyjski (Hiszpania, okolice Madrytu i Barcelony). Miesiąc w drodze, wysoka dieta zagraniczna, doświadczenie w długich trasach wymagane.', 'monthly', 4, 'curtain', 'C_E', ARRAY['uop','zlecenie']::text[], '[{"to":{"code":"ES","name":"Hiszpania"},"from":{"code":"PL","name":"Polska"}}]'::jsonb, '13000.00', '16500.00', 'PLN', true
from companies comp
where comp.nip = '1000000006'
  and not exists (
    select 1 from job_offers jo where jo.company_id = comp.id and jo.title = 'Firanka dalekobieżna — Hiszpania'
  );

insert into job_offers (company_id, title, description, home_return_cadence, required_years_experience, required_transport_type, license_category, employment_forms, routes, salary_min, salary_max, salary_currency, published)
select comp.id, 'HDS — Niemcy', 'Dostawy z rozładunkiem własnym żurawiem HDS na trasach do Niemiec — materiały budowlane i palety. Tydzień w trasie, uprawnienia UDT na żuraw samochodowy mile widziane.', 'weekly', 3, 'hds', 'C_E', ARRAY['b2b','zlecenie']::text[], '[{"to":{"code":"DE","name":"Niemcy"},"from":{"code":"PL","name":"Polska"}}]'::jsonb, '11000.00', '14000.00', 'PLN', true
from companies comp
where comp.nip = '1000000006'
  and not exists (
    select 1 from job_offers jo where jo.company_id = comp.id and jo.title = 'HDS — Niemcy'
  );

insert into job_offers (company_id, title, description, home_return_cadence, required_years_experience, required_transport_type, license_category, employment_forms, routes, salary_min, salary_max, salary_currency, published)
select comp.id, 'Firanka na Białoruś', 'Regularne trasy firanką na kierunku wschodnim — Białoruś, ładunki przemysłowe i paletowe. Tydzień w drodze, znajomość procedur odprawy celnej na przejściu granicznym wymagana.', 'weekly', 3, 'curtain', 'C', ARRAY['b2b']::text[], '[{"to":{"code":"BY","name":"Białoruś"},"from":{"code":"PL","name":"Polska"}}]'::jsonb, '8200.00', '10500.00', 'PLN', true
from companies comp
where comp.nip = '1000000012'
  and not exists (
    select 1 from job_offers jo where jo.company_id = comp.id and jo.title = 'Firanka na Białoruś'
  );

insert into job_offers (company_id, title, description, home_return_cadence, required_years_experience, required_transport_type, license_category, employment_forms, routes, salary_min, salary_max, salary_currency, published)
select comp.id, 'Firanka na Litwę', 'Trasa firanką Białystok–Wilno, dostawy dla sieci handlowych na Litwie. Tydzień w trasie, kat. C wystarczy, powrót do bazy na weekend.', 'weekly', 1, 'curtain', 'C', ARRAY['uop','zlecenie']::text[], '[{"to":{"code":"LT","name":"Litwa"},"from":{"code":"PL","name":"Polska"}}]'::jsonb, '7800.00', '9900.00', 'PLN', true
from companies comp
where comp.nip = '1000000012'
  and not exists (
    select 1 from job_offers jo where jo.company_id = comp.id and jo.title = 'Firanka na Litwę'
  );

insert into job_offers (company_id, title, description, home_return_cadence, required_years_experience, required_transport_type, license_category, employment_forms, routes, salary_min, salary_max, salary_currency, published)
select comp.id, 'Kontener na Niemcy', 'Transport kontenerów 40-stopowych z Podlasia do portu w Hamburgu. Wyjazd na miesiąc, umowa o pracę, kat. C+E z doświadczeniem w przewozie kontenerowym.', 'monthly', 4, 'container', 'C_E', ARRAY['uop']::text[], '[{"to":{"code":"DE","name":"Niemcy"},"from":{"code":"PL","name":"Polska"}}]'::jsonb, '11500.00', '14500.00', 'PLN', true
from companies comp
where comp.nip = '1000000012'
  and not exists (
    select 1 from job_offers jo where jo.company_id = comp.id and jo.title = 'Kontener na Niemcy'
  );

insert into job_offers (company_id, title, description, home_return_cadence, required_years_experience, required_transport_type, license_category, employment_forms, routes, salary_min, salary_max, salary_currency, published)
select comp.id, 'Kierowca firanki — Austria / Czechy', 'Regularne trasy z bazy w Chełmcu na Austrię i Czechy (Wiedeń, Linz, Ostrawa). Naczepa firanowa MEGA, ładunki paletowe i przemysłowe. Powrót do domu co dwa tygodnie. Pakiet medyczny, noclegi w kabinie, zaliczki na dietę co tydzień.', 'biweekly', 2, 'curtain', 'C_E', ARRAY['uop','b2b','zlecenie']::text[], '[{"to":{"code":"AT","name":"Austria"},"from":{"code":"PL","name":"Polska"}},{"to":{"code":"CZ","name":"Czechy"},"from":{"code":"PL","name":"Polska"}}]'::jsonb, '9500.00', '12500.00', 'PLN', true
from companies comp
where comp.nip = '1000000015'
  and not exists (
    select 1 from job_offers jo where jo.company_id = comp.id and jo.title = 'Kierowca firanki — Austria / Czechy'
  );

insert into job_offers (company_id, title, description, home_return_cadence, required_years_experience, required_transport_type, license_category, employment_forms, routes, salary_min, salary_max, salary_currency, published)
select comp.id, 'Kierowca silosu — pasze i cement (PL–DE)', 'Szukamy kierowcy naczepy silosowej na stałe trasy Nowy Sącz – południowe Niemcy (Bawaria / Badenia). Przewóz pasz i materiałów sypkich. Tydzień w drodze, weekend w domu. Szkolenie z obsługi silosu zapewniamy. Umowa o pracę, dieta, karta paliwowa, nowe ciągniki Scania.', 'weekly', 3, 'silo', 'C_E', ARRAY['zlecenie']::text[], '[{"to":{"code":"DE","name":"Niemcy"},"from":{"code":"PL","name":"Polska"}}]'::jsonb, '10000.00', '13000.00', 'PLN', true
from companies comp
where comp.nip = '1000000015'
  and not exists (
    select 1 from job_offers jo where jo.company_id = comp.id and jo.title = 'Kierowca silosu — pasze i cement (PL–DE)'
  );

insert into job_offers (company_id, title, description, home_return_cadence, required_years_experience, required_transport_type, license_category, employment_forms, routes, salary_min, salary_max, salary_currency, published)
select comp.id, 'Kierowca wywrotki — Słowacja (kruszywo)', 'Przewóz kruszywa i materiałów sypkich na budowach przy granicy: Nowy Sącz – Żilina / Poprad. Tydzień w trasie, weekend w domu. Wymagane prawo jazdy kat. C. Praca na nowszej wywrotce 8x4, ubezpieczenie, dodatek za nadgodziny.', 'weekly', 2, 'tipper', 'C', ARRAY['uop','b2b','zlecenie']::text[], '[{"to":{"code":"SK","name":"Słowacja"},"from":{"code":"PL","name":"Polska"}}]'::jsonb, '7500.00', '9500.00', 'PLN', true
from companies comp
where comp.nip = '1000000015'
  and not exists (
    select 1 from job_offers jo where jo.company_id = comp.id and jo.title = 'Kierowca wywrotki — Słowacja (kruszywo)'
  );

insert into job_offers (company_id, title, description, home_return_cadence, required_years_experience, required_transport_type, license_category, employment_forms, routes, salary_min, salary_max, salary_currency, published)
select comp.id, 'Cysterna ADR — Niemcy', 'Transport paliw i chemii cysterną na trasach do Niemiec. Wymagany aktualny ADR i kat. C+E. Tydzień w trasie, weekend w domu, umowa o pracę, wysokie doświadczenie premiowane wyższą stawką bazową.', 'weekly', 5, 'tanker', 'C_E', ARRAY['uop']::text[], '[{"to":{"code":"DE","name":"Niemcy"},"from":{"code":"PL","name":"Polska"}}]'::jsonb, '13000.00', '16000.00', 'PLN', true
from companies comp
where comp.nip = '1000000008'
  and not exists (
    select 1 from job_offers jo where jo.company_id = comp.id and jo.title = 'Cysterna ADR — Niemcy'
  );

insert into job_offers (company_id, title, description, home_return_cadence, required_years_experience, required_transport_type, license_category, employment_forms, routes, salary_min, salary_max, salary_currency, published)
select comp.id, 'Firanka Śląsk — Austria', 'Trasy firanką Katowice–Wiedeń / Graz, ładunki paletowe dla stałych odbiorców w Austrii. Powrót do bazy co tydzień, nowe naczepy Schmitz Cargobull w flocie.', 'weekly', 2, 'curtain', 'C_E', ARRAY['uop','b2b']::text[], '[{"to":{"code":"AT","name":"Austria"},"from":{"code":"PL","name":"Polska"}}]'::jsonb, '9500.00', '12500.00', 'PLN', true
from companies comp
where comp.nip = '1000000008'
  and not exists (
    select 1 from job_offers jo where jo.company_id = comp.id and jo.title = 'Firanka Śląsk — Austria'
  );

insert into job_offers (company_id, title, description, home_return_cadence, required_years_experience, required_transport_type, license_category, employment_forms, routes, salary_min, salary_max, salary_currency, published)
select comp.id, 'Wywrotka — Czechy dziennie', 'Transport kruszywa budowlanego wywrotką na trasie Katowice–Ostrawa, obsługa lokalnych budów po obu stronach granicy. Powrót do domu codziennie, kat. C wystarczy.', 'daily', 1, 'tipper', 'C', ARRAY['b2b']::text[], '[{"to":{"code":"CZ","name":"Czechy"},"from":{"code":"PL","name":"Polska"}}]'::jsonb, '7000.00', '9000.00', 'PLN', true
from companies comp
where comp.nip = '1000000008'
  and not exists (
    select 1 from job_offers jo where jo.company_id = comp.id and jo.title = 'Wywrotka — Czechy dziennie'
  );

insert into job_offers (company_id, title, description, home_return_cadence, required_years_experience, required_transport_type, license_category, employment_forms, routes, salary_min, salary_max, salary_currency, published)
select comp.id, 'HDS — Słowacja', 'Dostawy z rozładunkiem żurawiem HDS na trasie Nowy Sącz–Żilina — materiały budowlane i elementy prefabrykowane. Tydzień w trasie, powrót do bazy na weekend.', 'weekly', 2, 'hds', 'C_E', ARRAY['uop','b2b']::text[], '[{"to":{"code":"SK","name":"Słowacja"},"from":{"code":"PL","name":"Polska"}}]'::jsonb, '9500.00', '12000.00', 'PLN', true
from companies comp
where comp.nip = '1000000014'
  and not exists (
    select 1 from job_offers jo where jo.company_id = comp.id and jo.title = 'HDS — Słowacja'
  );

insert into job_offers (company_id, title, description, home_return_cadence, required_years_experience, required_transport_type, license_category, employment_forms, routes, salary_min, salary_max, salary_currency, published)
select comp.id, 'Niskopodwozie Beskidy — Niemcy', 'Transport maszyn i elementów stalowych naczepą niskopodwoziową z Beskidów do Niemiec. Miesiąc w drodze, wymagane doświadczenie z naczepą niską i mocowaniem ładunków ponadgabarytowych.', 'monthly', 5, 'low_loader', 'C_E', ARRAY['uop']::text[], '[{"to":{"code":"DE","name":"Niemcy"},"from":{"code":"PL","name":"Polska"}}]'::jsonb, '14500.00', '18500.00', 'PLN', true
from companies comp
where comp.nip = '1000000014'
  and not exists (
    select 1 from job_offers jo where jo.company_id = comp.id and jo.title = 'Niskopodwozie Beskidy — Niemcy'
  );

insert into job_offers (company_id, title, description, home_return_cadence, required_years_experience, required_transport_type, license_category, employment_forms, routes, salary_min, salary_max, salary_currency, published)
select comp.id, 'Platforma — Czechy', 'Transport elementów prefabrykowanych platformą na budowy w Czechach. Tydzień w trasie, kat. C, rozliczenie na zleceniu.', 'weekly', 1, 'flatbed', 'C', ARRAY['b2b']::text[], '[{"to":{"code":"CZ","name":"Czechy"},"from":{"code":"PL","name":"Polska"}}]'::jsonb, '8000.00', '10200.00', 'PLN', true
from companies comp
where comp.nip = '1000000014'
  and not exists (
    select 1 from job_offers jo where jo.company_id = comp.id and jo.title = 'Platforma — Czechy'
  );

insert into job_offers (company_id, title, description, home_return_cadence, required_years_experience, required_transport_type, license_category, employment_forms, routes, salary_min, salary_max, salary_currency, published)
select comp.id, 'Kierowca C+E — firanka PL–DE', 'Regularne trasy Polska–Niemcy na naczepie firanowej. Tydzień w drodze, weekend w domu. Umowa o pracę, dieta, noclegi w kabinie premium.', 'weekly', 2, 'curtain', 'C_E', ARRAY['uop']::text[], '[{"to":{"code":"DE","name":"Niemcy"},"from":{"code":"PL","name":"Polska"}}]'::jsonb, '9000.00', '12000.00', 'PLN', true
from companies comp
where comp.nip = '1000000004'
  and not exists (
    select 1 from job_offers jo where jo.company_id = comp.id and jo.title = 'Kierowca C+E — firanka PL–DE'
  );

insert into job_offers (company_id, title, description, home_return_cadence, required_years_experience, required_transport_type, license_category, employment_forms, routes, salary_min, salary_max, salary_currency, published)
select comp.id, 'Kierowca chłodni — Francja', 'Trasy spożywcze Polska–Francja naczepą chłodniczą, dostawy do centrów dystrybucyjnych sieci handlowych. Powrót co dwa tygodnie. Wymagane doświadczenie w chłodniach, ADR mile widziane.', 'biweekly', 3, 'reefer', 'C_E', ARRAY['b2b','zlecenie']::text[], '[{"to":{"code":"FR","name":"Francja"},"from":{"code":"PL","name":"Polska"}}]'::jsonb, '11000.00', '14000.00', 'PLN', true
from companies comp
where comp.nip = '1000000004'
  and not exists (
    select 1 from job_offers jo where jo.company_id = comp.id and jo.title = 'Kierowca chłodni — Francja'
  );

insert into job_offers (company_id, title, description, home_return_cadence, required_years_experience, required_transport_type, license_category, employment_forms, routes, salary_min, salary_max, salary_currency, published)
select comp.id, 'Autowóz — Niemcy / Holandia', 'Przewóz samochodów osobowych autolawetą na trasie Polska–Niemcy–Holandia dla sieci dealerskiej. Wyjazd na miesiąc, wymagane prawo jazdy kat. C+E i doświadczenie w przewozie pojazdów.', 'monthly', 4, 'car_transporter', 'CE', ARRAY['b2b']::text[], '[{"to":{"code":"DE","name":"Niemcy"},"from":{"code":"PL","name":"Polska"}},{"to":{"code":"NL","name":"Holandia"},"from":{"code":"PL","name":"Polska"}}]'::jsonb, '12500.00', '16000.00', 'PLN', true
from companies comp
where comp.nip = '1000000005'
  and not exists (
    select 1 from job_offers jo where jo.company_id = comp.id and jo.title = 'Autowóz — Niemcy / Holandia'
  );

insert into job_offers (company_id, title, description, home_return_cadence, required_years_experience, required_transport_type, license_category, employment_forms, routes, salary_min, salary_max, salary_currency, published)
select comp.id, 'Firanka Poznań — Niemcy', 'Klasyczna trasa firanką Poznań–Niemcy, tydzień w drodze, powrót na weekend. Flota Scania rocznik 2023, pakiet medyczny dla kierowcy i rodziny.', 'weekly', 2, 'curtain', 'C_E', ARRAY['zlecenie']::text[], '[{"to":{"code":"DE","name":"Niemcy"},"from":{"code":"PL","name":"Polska"}}]'::jsonb, '9200.00', '11800.00', 'PLN', true
from companies comp
where comp.nip = '1000000005'
  and not exists (
    select 1 from job_offers jo where jo.company_id = comp.id and jo.title = 'Firanka Poznań — Niemcy'
  );

insert into job_offers (company_id, title, description, home_return_cadence, required_years_experience, required_transport_type, license_category, employment_forms, routes, salary_min, salary_max, salary_currency, published)
select comp.id, 'Platforma — Beneluks', 'Transport maszyn i ładunków paletowych platformą na kierunku Beneluks (Holandia, Belgia). Powrót do bazy w Poznaniu co dwa tygodnie.', 'biweekly', 3, 'flatbed', 'C_E', ARRAY['b2b']::text[], '[{"to":{"code":"NL","name":"Holandia"},"from":{"code":"PL","name":"Polska"}},{"to":{"code":"BE","name":"Belgia"},"from":{"code":"PL","name":"Polska"}}]'::jsonb, '11000.00', '14000.00', 'PLN', true
from companies comp
where comp.nip = '1000000005'
  and not exists (
    select 1 from job_offers jo where jo.company_id = comp.id and jo.title = 'Platforma — Beneluks'
  );

commit;
