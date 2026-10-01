# Eliminazione delle annotazioni GitHub Actions

Le annotazioni che citano `checkout@v4`, `setup-node@v4`, `upload-artifact@v4`,
`deploy-pages@v4`, `configure-pages@v5` e `ubuntu-latest` dimostrano che GitHub
sta ancora eseguendo il vecchio workflow presente nel repository.

Il file corretto è già incluso in:

`.github/workflows/deploy-pages.yml`

Poiché su macOS la cartella `.github` può risultare nascosta, nella cartella
principale è inclusa anche la copia visibile:

`WORKFLOW_GITHUB_DEPLOY_PAGES.yml`

Nel repository GitHub occorre aprire `.github/workflows/deploy-pages.yml` e
sostituirne interamente il contenuto con quello della copia visibile. Il file
`WORKFLOW_GITHUB_DEPLOY_PAGES.yml` nella cartella principale è soltanto una
copia di servizio e non viene eseguito automaticamente da GitHub.
