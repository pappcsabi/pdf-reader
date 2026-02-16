# Activare reader.aithentic.ro

## Pasul 1: Adaugă recordul DNS

Domeniul **aithentic.ro** folosește nameserver-ele CyberFolks. Adaugă subdomeniul în panoul de gestionare DNS:

### În CyberFolks (panel.cyberfolks.pl / cyberfolks.ro)

1. **Autentifică-te** în panoul client CyberFolks
2. Deschide ** Domenii** sau **DNS**
3. Selectează domeniul **aithentic.ro**
4. Deschide **Zone DNS** / **Gestionare înregistrări DNS** / **Records**
5. Adaugă un record nou:
   - **Tip**: A
   - **Nume/Host**: `reader` (sau `reader.aithentic.ro`)
   - **Valoare/Points to**: `89.46.7.215`
   - **TTL**: 300 sau Auto
6. Salvează modificările

Propagarea DNS durează de obicei **5–15 minute**.

### Verificare DNS

```bash
dig reader.aithentic.ro +short
```

Ar trebui să apară: `89.46.7.215`

---

## Pasul 2: Activează SSL pe server

După ce DNS-ul s-a propagat:

```bash
ssh cursor@89.46.7.215
cd ~/pdf-reader && bash scripts/setup-ssl-reader.sh
```

Scriptul verifică DNS-ul și rulează Certbot pentru certificat Let's Encrypt.

---

## Pasul 3: Verificare

Deschide în browser: **https://reader.aithentic.ro**
