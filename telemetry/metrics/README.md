# Metrics

## Key Metrics

| Metric | Source | Target |
|--------|--------|--------|
| Build time | `npx next build` | < 5s compile |
| Docker build | EC2 SSM | < 7 min |
| AI assist latency | runAssist timing | < 15s for sonnet, < 30s for opus |
| AI accept rate | aiInteractions.status | > 70% |
| Findings generation | currentstate.narrative | Completes without error |
| Asset generation | custom prompt assets | Opens in new tab with content |
| Workshop scoring | levelReadiness() | Math matches test fixtures |
| Page load | Browser | < 3s for workshop page |

## Collection
Currently manual. TODO: integrate with CloudWatch or Grafana.
