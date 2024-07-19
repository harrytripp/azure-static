# Azure-Based Static Website with CI/CD Pipeline
Creating a platform for developing and hosting my personal website: **[harrytripp.com](https://www.harrytripp.com)**

## Overview

This project involves setting up a static website hosted on Azure Storage, enhanced with CDN for performance and security, and integrated with a CI/CD pipeline using GitHub Actions. Infrastructure is deployed and managed using Bicep.

## Architecture

![Architecture Diagram](https://github.com/harrytripp/azure-static/blob/92e3f68b4f9bdfe754a0793ced8da9a452546285/assets/readme/Static%20Website%20Architecture%20Diagram.png)

## Features

- **Static Website**: Hosted on an Azure Storage Blob, coded using HTML and CSS.
- **HTTPS Security**: Implemented using Azure CDN and Cloudflare DNS.
- **Infrastructure as Code (IaC)**: Automated infrastructure setup with Bicep.
- **CI/CD Pipeline**: Continuous integration and deployment set up with GitHub Actions.

## Technologies Used

- **Bicep**
- **GitHub Actions**
- **Azure Storage**
- **Azure CDN**
- **Cloudflare DNS**
- **Visual Studio Code**
- **HTML & CSS**

## Getting Started

### Prerequisites

- Azure Subscription with a Resource Group
- GitHub Account with a repository to store your website content
- Visual Studio Code with GitHub Codespaces extension

### Setup Instructions

1. **Set Up GitHub Codespaces in VS Code to work directly in you website repository.**

   Follow [this guide](https://docs.github.com/en/codespaces/developing-in-a-codespace/using-github-codespaces-in-visual-studio-code) to set up Codespaces in VSCode.

3. **Create and configure Azure resources Using Bicep**

   I have divided [this Bicep file](https://github.com/harrytripp/bicep/tree/9125cf52f740baed65e04cca998316cca84b456d/CDN%20with%20Storage%20Account%20and%20Static%20Website) into sections below.

   1. **Set the parameters and variables**

        ```bicep
         // Enabling static website hosting isn't possible directly in Bicep or an ARM template,
         // so this uses a deployment script to enable the feature.
         
         @description('The location into which the resources should be deployed.')
         param location string = resourceGroup().location
         
         @description('The name of the storage account to use for site hosting.')
         param storageAccountName string = 'stor${uniqueString(resourceGroup().id)}'
         
         @description('The storage account sku name.')
         param storageSku string = 'Standard_LRS'
         
         @description('The path to the web index document.')
         param indexDocumentPath string = 'index.html'
         
         @description('The contents of the web index document.')
         param indexDocumentContents string = '<h1>Static website</h1>'
         
         @description('The path to the web error document.')
         param errorDocument404Path string = 'error.html'
         
         @description('The contents of the web error document.')
         param errorDocument404Contents string = '<h1>404 error</h1>'
         
         // Generates endpoint name from resource group id.
         var endpointName = 'endpoint-${uniqueString(resourceGroup().id)}'
         
         // Generates CDN profile name from resource group id.
         var profileName = 'cdn-${uniqueString(resourceGroup().id)}'
         
         // Gets the web endpoint of the static website.
         var storageAccountHostName = replace(replace(storageAccount.properties.primaryEndpoints.web, 'https://', ''), '/', '')
         ```

   2. **Create the storage account**

      ```bicep
      resource storageAccount 'Microsoft.Storage/storageAccounts@2023-05-01' = {
        name: storageAccountName
        location: location
        kind: 'StorageV2'
        // Secure the storage account
        properties: { // Secure the storage account
          allowBlobPublicAccess: false
          supportsHttpsTrafficOnly: true
          minimumTlsVersion: 'TLS1_2'
          accessTier: 'Hot'
        }
        sku: {
          name: storageSku
        }
      }
      ```
      
   3. **Create a managed identity using the Storage Account Contributer role. This allows the deployment of a PowerShell script which enables the Static Website on the Storage Account**

      ```bicep
      resource contributorRoleDefinition 'Microsoft.Authorization/roleDefinitions@2022-05-01-preview' existing = {
        scope: subscription()
        // This is the Storage Account Contributor role, which is the minimum role permission we can give. See https://docs.microsoft.com/en-us/azure/role-based-access-control/built-in-roles#:~:text=17d1049b-9a84-46fb-8f53-869881c3d3ab
        name: '17d1049b-9a84-46fb-8f53-869881c3d3ab'
      }
      
      resource managedIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-07-31-preview' = {
        name: 'DeploymentScript'
        location: location
      }
      
      resource roleAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
        scope: storageAccount
        name: guid(resourceGroup().id, managedIdentity.id, contributorRoleDefinition.id)
        properties: {
          roleDefinitionId: contributorRoleDefinition.id
          principalId: managedIdentity.properties.principalId
          principalType: 'ServicePrincipal'
        }
      }
      ```

   5. **When the role assignment has applied, deploy the PowerShell script to enable the Static Website**

      1. **Call the PowerShell script if the role assignment is complete**

      ```bicep
      dependsOn: [
          // To ensure we wait for the role assignment to be deployed before trying to access the storage account
          roleAssignment
        ]
        properties: {
          azPowerShellVersion: '7.0'
          scriptContent: loadTextContent('./scripts/enable-static-website.ps1')
          retentionInterval: 'PT4H' // 4 hours script retention post termination
          environmentVariables: [
            {
              name: 'ResourceGroupName'
              value: resourceGroup().name
            }
            {
              name: 'StorageAccountName'
              value: storageAccount.name
            }
            {
              name: 'IndexDocumentPath'
              value: indexDocumentPath
            }
            {
              name: 'IndexDocumentContents'
              value: indexDocumentContents
            }
            {
              name: 'ErrorDocument404Path'
              value: errorDocument404Path
            }
            {
              name: 'ErrorDocument404Contents'
              value: errorDocument404Contents
            }
          ]
        }
      }
      ```

      2. **This is the PowerShell script that runs:**

      ```powershell
      $ErrorActionPreference = 'Stop'
      $storageAccount = Get-AzStorageAccount -ResourceGroupName $env:ResourceGroupName -AccountName $env:StorageAccountName
      
      # Enable the static website feature on the storage account.
      $ctx = $storageAccount.Context
      Enable-AzStorageStaticWebsite -Context $ctx -IndexDocument $env:IndexDocumentPath -ErrorDocument404Path $env:ErrorDocument404Path
      
      # Add the two HTML pages.
      $tempIndexFile = New-TemporaryFile
      Set-Content $tempIndexFile $env:IndexDocumentContents -Force
      Set-AzStorageBlobContent -Context $ctx -Container '$web' -File $tempIndexFile -Blob $env:IndexDocumentPath -Properties @{'ContentType' = 'text/html'} -Force
      
      $tempErrorDocument404File = New-TemporaryFile
      Set-Content $tempErrorDocument404File $env:ErrorDocument404Contents -Force
      Set-AzStorageBlobContent -Context $ctx -Container '$web' -File $tempErrorDocument404File -Blob $env:ErrorDocument404Path -Properties @{'ContentType' = 'text/html'} -Force
      ```
         
   7. **Create the Azure CDN Profile and its Endpoint**

      ```bicep
        resource cdnProfile 'Microsoft.Cdn/profiles@2024-02-01' = {
           name: profileName
           location: 'global'
           tags: {
             displayName: profileName
           }
           sku: {
             name: 'Standard_Microsoft'
           }
         }
         
         resource endpoint 'Microsoft.Cdn/profiles/endpoints@2024-02-01' = {
           parent: cdnProfile
           name: endpointName
           location: 'global'
           tags: {
             displayName: endpointName
           }
           properties: {
             originHostHeader: storageAccountHostName
             isHttpAllowed: true
             isHttpsAllowed: true
             queryStringCachingBehavior: 'IgnoreQueryString'
             contentTypesToCompress: [
               'text/plain'
               'text/html'
               'text/css'
               'application/x-javascript'
               'text/javascript'
             ]
             isCompressionEnabled: true
             origins: [
               {
                 name: 'origin1'
                 properties: {
                   hostName: storageAccountHostName
                 }
               }
             ]
           }
         }
        ```

4. **Cloudflare DNS Configuration**

   I used Cloudflare as my DNS provider, but you can use your own.
   Follow the steps outlined in the [Cloudflare DNS documentation](https://learn.microsoft.com/en-us/azure/storage/blobs/storage-custom-domain-name?tabs=azure-portal) to configure your CNAME record to point to the Azure CDN endpoint.
   Be aware that you cannot use your root/apex domain (example.com) so you will need to create a subdomain to use instead (www.example.com). This is because Cloudflare uses [CNAME flattening](https://developers.cloudflare.com/dns/cname-flattening).
   
6. **Set Up Continuous Integration/Continuous Deployment (CI/CD)**
      - Create your secret key...
      - Create a GitHub Actions workflow to automate deployments of the website to Azure Blob storage:
   
        ```yaml
        name: Blob storage website CI
        
        on:
            push:
                branches: [ main ]
        
        jobs:
          build:
            runs-on: ubuntu-latest
            steps:
            - uses: actions/checkout@v3
            - uses: azure/login@v1
              with:
                  creds: ${{ secrets.AZURE_CREDENTIALS }}
        
            - name: Upload to blob storage
              uses: azure/CLI@v1
              with:
                inlineScript: |
                    az storage blob upload-batch --overwrite --account-name harrytrippcomassets --auth-mode login -d '$web' -s .
            - name: Purge CDN endpoint
              uses: azure/CLI@v1
              with:
                inlineScript: |
                   az cdn endpoint purge --content-paths  "/*" --profile-name "StaticCDN" --name "StaticEndpoint.azureedge.net" --resource-group "RG-Static-01"
        
          # Azure logout
            - name: logout
              run: |
                    az logout
              if: always()
     ```

7. **Verify and Monitor**

   - Test your static website to ensure it is functioning correctly.
   - Regularly monitor Azure and Cloudflare for any issues.

## Additional Resources

- [Azure Static Website Hosting](https://learn.microsoft.com/en-us/azure/storage/blobs/storage-blob-static-website-host)
- [Azure CDN with Custom Domain](https://learn.microsoft.com/en-us/azure/cdn/cdn-storage-custom-domain-https)
- [GitHub Actions for Azure](https://docs.github.com/en/actions/deployment/targeting-azure)
- [Cloudflare SSL/TLS Settings](https://developers.cloudflare.com/ssl/)
- [Cloudflare DNS](https://developers.cloudflare.com/dns/)

## Conclusion

This project provided hands-on experience with Azure services, from hosting a static website to implementing a secure and efficient CI/CD pipeline. It enhanced my understanding of cloud infrastructure and automation, emphasizing best practices in deployment and security.

## Acknowledgements

- [Microsoft Learn](https://learn.microsoft.com/en-us/training/azure/)
- [GitHub Documentation](https://docs.github.com/)
- [Cloudflare Documentation](https://developers.cloudflare.com/)

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for more details.
