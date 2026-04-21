const bibServiceResponse = ({isResearch}) => {
  return {
          data: [
            {
              id: 'abcdefg',
              varFields: [
                {
                  marcTag: '910',
                  subfields: [
                    {
                      tag: 'a',
                      content: isResearch? 'RL' : 'BL'
                    }
                  ]
                }
              ]
            }
          ]
        }
}