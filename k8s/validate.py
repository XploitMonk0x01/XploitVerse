import yaml, sys, os

files = [
    'namespace.yaml',
    'serviceaccount.yaml',
    'configmap.yaml',
    'secret.yaml',
    'service.yaml',
    'ingress.yaml',
    'hpa.yaml',
    'pdb.yaml',
    'kustomization.yaml',
    'argocd/application.yaml',
]

base = '/mnt/d/XploitVerse/k8s'
failed = 0

for f in files:
    path = os.path.join(base, f)
    try:
        docs = list(yaml.safe_load_all(open(path)))
        print(f'OK  {f}  ({len(docs)} doc(s))')
    except Exception as e:
        print(f'FAIL  {f}  -- {e}')
        failed += 1

sys.exit(failed)
