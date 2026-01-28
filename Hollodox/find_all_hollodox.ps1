# Find all boop/hollodox/hellodoc files
Get-ChildItem 'C:\Users\phaze\games_n_apps' -Recurse -Include '*boop*','*hollodox*','*hellodoc*' -File -ErrorAction SilentlyContinue |
    Where-Object { $_.FullName -notlike '*node_modules*' } |
    Select-Object FullName
